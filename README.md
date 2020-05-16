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
