import {getWallet, setupContract, ONE, attachContract} from './helper'
import { network } from 'redspot'
import { expect } from "chai";
import * as BN from "bn.js";
import {encodeAddress} from "@polkadot/keyring";
describe('PAIR', () => {
        async function setup() {
            const wallet = await getWallet()
            const tokenA = await setupContract('psp22_token', 'new', new BN(ONE.muln(10000)))
            const tokenB = await setupContract('psp22_token', 'new', new BN(ONE.muln(10000)))
            const pair = await setupContract('pair_contract', 'new')
            const pair_code_hash = (await pair.abi).source.hash
            const factory_contract = await setupContract('factory_contract', 'new', wallet.address, pair_code_hash)
            await factory_contract.contract.tx["factory::createPair"](tokenA.contract.address, tokenB.contract.address)
            const pair_address = await factory_contract.query["factory::getPair"](tokenA.contract.address, tokenB.contract.address)
            const pair_contract = await attachContract('pair_contract', pair_address.output.unwrap())
            const token0Address = await pair_contract.query["pair::getToken0"]()
            const token0 = tokenA.contract.address === token0Address.output ? tokenA : tokenB
            const token1 = tokenA.contract.address === token0Address.output ? tokenB : tokenA

            return {
                wallet,
                token_0: token0.contract,
                token_1: token1.contract,
                pair: pair_contract.contract,
            }
        }

        it('mint', async () => {
            await setup()
            const { token_0, token_1, pair, wallet } = await setup()

            const token0Amount = ONE
            const token1Amount = ONE.muln(4)
            const expectedLiquidity = ONE.muln(2)

            await expect(token_0.tx['psp22::transfer'](pair.address, token0Amount, [])).to.eventually.be.fulfilled
            await expect(token_1.tx['psp22::transfer'](pair.address, token1Amount, [])).to.eventually.be.fulfilled


            await expect(pair.tx['pair::mint'](wallet.address, token1Amount)).to.eventually.be.fulfilled

            await expect(pair.query["psp22::totalSupply"]()).to.eventually.have.property('output').to.equal(expectedLiquidity)
        })

})