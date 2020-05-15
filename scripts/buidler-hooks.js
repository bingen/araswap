/*
 * These hooks are called by the Aragon Buidler plugin during the start task's lifecycle. Use them to perform custom tasks at certain entry points of the development build process, like deploying a token before a proxy is initialized, etc.
 *
 * Link them to the main buidler config file (buidler.config.js) in the `aragon.hooks` property.
 *
 * All hooks receive two parameters:
 * 1) A params object that may contain other objects that pertain to the particular hook.
 * 2) A "bre" or BuidlerRuntimeEnvironment object that contains enviroment objects like web3, Truffle artifacts, etc.
 *
 * Please see AragonConfigHooks, in the plugin's types for further details on these interfaces.
 * https://github.com/aragon/buidler-aragon/blob/develop/src/types.ts#L31
 */

let minime, ant, tokens, voting

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
const INITIAL_ANT_TOKENS = 1000

const bigExp = (x, y) =>
  web3.utils.toBN(x).mul(web3.utils.toBN(10).pow(web3.utils.toBN(y)))
const pct16 = (x) => bigExp(x, 16)
const decimals18 = (x) => bigExp(x, 18)

module.exports = {
  // Called before a dao is deployed.
  preDao: async ({ log }, { web3, artifacts }) => {},

  // Called after a dao is deployed.
  postDao: async (
    { dao, _experimentalAppInstaller, log },
    { web3, artifacts }
  ) => {

    // Retrieve accounts.
    const accounts = await web3.eth.getAccounts()

    // Deploy a minime token for the Token Manager an generate tokens for test accounts
    const minimeSymbol = 'AST'
    minime = await deployMinimeToken(artifacts, 'Araswap Token', minimeSymbol)
    log(`> Minime token ${minimeSymbol} deployed: ${minime.address}`)
    await transferTokens(accounts, minime, 1, log)

    // Deploy a minime token to be exchanged an generate tokens for test accounts
    const antSymbol = 'ANT'
    ant = await deployMinimeToken(artifacts, 'ANT Test Token', antSymbol)
    log(`> Minime token ${antSymbol} deployed: ${ant.address}`)
    await transferTokens(accounts, ant, INITIAL_ANT_TOKENS, log)

    tokens = await _experimentalAppInstaller('token-manager', {
      skipInitialize: true,
    })

    await minime.changeController(tokens.address)
    log(`> Change minime controller to tokens app`)
    await tokens.initialize([minime.address, true, 0])
    log(`> Tokens app installed: ${tokens.address}`)

    voting = await _experimentalAppInstaller('voting', {
      initializeArgs: [
        tokens.address,
        pct16(50), // support 50%
        pct16(25), // quorum 15%
        604800, // 7 days
      ],
    })
    log(`> Voting app installed: ${voting.address}`)

    await voting.createPermission('CREATE_VOTES_ROLE', tokens.address)
  },

  // Called after the app's proxy is created, but before it's initialized.
  preInit: async (
    { proxy, _experimentalAppInstaller, log },
    { web3, artifacts }
  ) => {},

  // Called when the start task needs to know the app proxy's init parameters.
  // Must return an array with the proxy's init parameters.
  getInitParams: async ({ log }, { web3, artifacts }) => {
    return [
      ant.address,
    ]
  },

  // Called after the app's proxy is initialized.
  postInit: async (
    { proxy, _experimentalAppInstaller, log },
    { web3, artifacts }
  ) => {
    // Retrieve accounts.
    const accounts = await web3.eth.getAccounts()

    // approve unlimited tokens to the proxy app
    await approveTokens(accounts, ant, INITIAL_ANT_TOKENS, proxy)

    await tokens.createPermission('MINT_ROLE', voting.address)
    await tokens.createPermission('BURN_ROLE', voting.address)

    // set dao permissions to Voting
    await switchRootDaoPermissions(proxy, artifacts, web3)
  },

  // Called after the app's proxy is updated with a new implementation.
  postUpdate: async ({ proxy, log }, { web3, artifacts }) => {},
}

async function transferTokens(accounts, minime, tokenAmount, log) {
  const amount = decimals18(tokenAmount)

  for (let index = 0; index < 3; index++) {
    await minime.generateTokens(accounts[index], amount)
    log(`> Mint ${amount} tokens to ${accounts[index]}`)
  }
}

async function approveTokens(accounts, minime, tokenAmount, proxy) {
  const amount = decimals18(tokenAmount)

  for (let index = 0; index < 3; index++) {
    await minime.approve(proxy.address, amount, { from: accounts[index] })
  }
}

async function deployMinimeToken(artifacts, name, symbol) {
  const MiniMeToken = await artifacts.require('MiniMeToken')
  const token = await MiniMeToken.new(
    ZERO_ADDRESS,
    ZERO_ADDRESS,
    0,
    name,
    18,
    symbol,
    true
  )
  return token
}

// TODO: buidler-plugin helpers?
async function getKernel(proxy, artifacts) {
  const kernelAddress = await proxy.kernel()
  const Kernel = await artifacts.require('Kernel')
  const kernel = await Kernel.at(kernelAddress)

  return kernel
}

async function getAcl(dao, artifacts) {
  const aclAddress = await dao.acl()
  const ACL = await artifacts.require('ACL')
  const acl = await ACL.at(aclAddress)

  return acl
}

async function switchRole(acl, from, to, app, role) {
  await acl.grantPermission(to, app, role)
  await acl.revokePermission(from, app, role)
  await acl.setPermissionManager(to, app, role)
}

async function switchRootDaoPermissions(proxy, artifacts, web3) {
  const accounts = await web3.eth.getAccounts()
  const rootAccount = accounts[0]

  const dao = await getKernel(proxy, artifacts)
  const acl = await getAcl(dao, artifacts)

  const appManagerRole = await dao.APP_MANAGER_ROLE()
  const createPermissionsRole = await acl.CREATE_PERMISSIONS_ROLE()

  await switchRole(acl, rootAccount, voting.address, dao.address, appManagerRole)
  // TODO!!
  // setAllPermissionsOpenly runs after postInit and fails after this:
  //await switchRole(acl, rootAccount, voting.address, acl.address, createPermissionsRole)
}
