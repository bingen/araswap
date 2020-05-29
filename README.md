# Araswap

Simple Aragon app for swapping tokens and ETH.

⚠ This is only an experiment, intended to be used as a tutorial to learn developing Aragon apps. **Don’t use this on mainnet!!!**

Based on [this Solidity version](https://github.com/PhABC/uniswap-solidity/blob/master/contracts/uniswap/UniswapExchange.sol) of Uniswap contracts.

## Running your app

To run the app in a browser with frontend and contract hot-reloading, simply run `npm start`.

### npm Scripts

- **postinstall**: Runs after installing dependencies.
- **build-app**: Installs front end project (app/) dependencies.
- **start** Runs your app inside a DAO.
- **compile**: Compiles the smart contracts.
- **test**: Runs tests for the contracts.
- **publish:major**: Releases a major version to aragonPM.
- **publish:minor**: Releases a minor version to aragonPM.
- **publish:patch**: Releases a patch version to aragonPM.

# Tutorial

## Step 0

```
git checkout step_0
```

This is just the simple Counter app that comes bundled with `create-aragon-app` command.

You can try modifying either the frontend or the contracts and see the hot reloading in action.

## Step 1

```
git checkout step_1
```

You can also run
```
git diff step_0..step_1
```

to see the relevant code for this first step.

With this step you have an upgradable version of Uniswap, embedded in a DAO with a Token Manager and a Voting app, that will govern this upgradeability. Liquidity tokens of the exchange app are still independent, and fees are fixed (hardcoded).

## Step 2

```
git checkout step_2
```

As in the previous step, you can run
```
git diff step_1..step_2
```

to see what has changed.

Here we go one step beyond and the liquidity token of the Araswap serves as native token of the DAO. This means that the (only) way to become member of the DAO is by providing liquity to the exchange, and the more liquidity you provide, the more power you will have in the DAO.

There’s a new role, assigned to Voting app, which in turn relies on the Token Manager and therefore in the liquidity providers, that allows to change the fees paid on exchanging.

### Test

Before testing, it may be a good idea to check `scripts/buidler-hooks.js` file, where all the buidler magic for setting the environment up happens.

Open a console with `npx buidler console` and try the following commands to test all those things explained above:

```
const accounts = await web3.eth.getAccounts()

web3.utils.fromWei(await web3.eth.getBalance(accounts[0]))

// minime is the liquidity token and the token of the DAO
const MiniMeToken = await artifacts.require('MiniMeToken')
const minime = await MiniMeToken.at('0xdc05EFc3029024068FCc86f05323411f14D69280')

// ANT is the token exchanged
const ant = await MiniMeToken.at('0xf1f8AAc64036cdd399886b1C157B7e3b361093F3')
const ant = await MiniMeToken.at('0x9D6F6d86B81289e40e07fCdA805C06F6E9B8f629')

// initial token supplies
web3.utils.fromWei(await minime.totalSupply())
web3.utils.fromWei(await ant.totalSupply())

// initial balances
web3.utils.fromWei(await minime.balanceOf(accounts[0]))
web3.utils.fromWei(await ant.balanceOf(accounts[0]))

// our exchange app
const Araswap = await artifacts.require('Araswap')
const araswap = await Araswap.at('0x8f1cf28DCD72f5CF75091E61BF99f7Ac2edb9DAC')
// with its balances
web3.utils.fromWei(await ant.balanceOf(araswap.address))
web3.utils.fromWei(await web3.eth.getBalance(araswap.address))

// first approve the exchange token to the exchange app
await ant.approve(araswap.address, await ant.balanceOf(accounts[0]), { from: accounts[0] })
await ant.approve(araswap.address, await ant.balanceOf(accounts[1]), { from: accounts[1] })
await ant.approve(araswap.address, await ant.balanceOf(accounts[2]), { from: accounts[2] })

// add liquidity, from different accounts and amounts
await araswap.addLiquidity(1, web3.utils.toWei('10'), 2123456789, { value: web3.utils.toWei('1') })
await araswap.addLiquidity(1, web3.utils.toWei('100'), 2123456789, { value: web3.utils.toWei('1'), from: accounts[1] })
await araswap.addLiquidity(1, web3.utils.toWei('100'), 2123456789, { value: web3.utils.toWei('2.2'), from: accounts[2] })

// add liqidity with a simple transaction (that hits the payable fallback)
web3.utils.fromWei(await ant.balanceOf(accounts[3]))
web3.utils.fromWei(await web3.eth.getBalance(accounts[3]))
await araswap.sendTransaction({ value: web3.utils.toWei('0.5'), from: accounts[3] })
web3.utils.fromWei(await ant.balanceOf(accounts[3]))
web3.utils.fromWei(await web3.eth.getBalance(accounts[3]))
```

Any time you add liquidity, make sure to check on the frontend how new tokens are minted on the Token Manager.
