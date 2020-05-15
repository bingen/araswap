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

let minime, tokens, bigExp

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

module.exports = {
  // Called before a dao is deployed.
  preDao: async ({ log }, { web3, artifacts }) => {},

  // Called after a dao is deployed.
  postDao: async (
    { dao, _experimentalAppInstaller, log },
    { web3, artifacts }
  ) => {
    bigExp = (x, y) =>
      web3.utils.toBN(x).mul(web3.utils.toBN(10).pow(web3.utils.toBN(y)))
    pct16 = (x) => bigExp(x, 16)

    // Retrieve accounts.
    const accounts = await web3.eth.getAccounts()

    // Deploy a minime token an generate tokens for test accounts
    minime = await deployMinimeToken(artifacts)
    await transferTokens(accounts, minime, log)

    log(`> Minime token deployed: ${minime.address}`)

    tokens = await _experimentalAppInstaller('token-manager', {
      skipInitialize: true,
    })

    await minime.changeController(tokens.address)
    log(`> Change minime controller to tokens app`)
    await tokens.initialize([minime.address, true, 0])
    log(`> Tokens app installed: ${tokens.address}`)

    const voting = await _experimentalAppInstaller('voting', {
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
      minime.address,
      tokens.address,
      bigExp(3, 15), // fee 0.3%
    ]
  },

  // Called after the app's proxy is initialized.
  postInit: async (
    { proxy, _experimentalAppInstaller, log },
    { web3, artifacts }
  ) => {
    // approve unlimited tokens to the proxy app
    await approveTokens(minime, proxy)

    await tokens.createPermission('MINT_ROLE', proxy.address)
    await tokens.createPermission('BURN_ROLE', proxy.address)
  },

  // Called after the app's proxy is updated with a new implementation.
  postUpdate: async ({ proxy, log }, { web3, artifacts }) => {},
}

async function transferTokens(accounts, minime, log) {
  const amount = pct16(100000)
  for (let index = 0; index < 3; index++) {
    await minime.generateTokens(accounts[index], amount)
    log(`> Mint ${amount} tokens to ${accounts[index]}`)
  }
}

async function approveTokens(minime, proxy) {
  for (let index = 1; index < 4; index++) {
    await minime.approve(proxy.address, 0)
  }
}

async function deployMinimeToken(artifacts) {
  const MiniMeToken = await artifacts.require('MiniMeToken')
  const token = await MiniMeToken.new(
    ZERO_ADDRESS,
    ZERO_ADDRESS,
    0,
    'ANT Test Token',
    18,
    'ANT',
    true
  )
  return token
}
