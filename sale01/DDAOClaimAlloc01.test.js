const { expect, assert } = require("chai");
const truffleAssert = require('truffle-assertions');

const bn1e6 = ethers.BigNumber.from((10**6).toString());
const ZERRO = '0x0000000000000000000000000000000000000000';
const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000';
const DEFAULT_TOKEN_ADDR = '0x753f470F3a283A8e99e5dacf9dD0eDf7F64a9F80';
const LEVEL_MIN_1 = 300;
const LEVEL_MIN_2 = 3000;
const LEVEL_MIN_3 = 5000;

let owner;
let payer1;
let payer2;
let payer3;

let ddaoAllocV02;
let usdcTest;

let DDAOAllocV02Contract = artifacts.require('DDAOallocV02');
let ddaoAllocV02Inst;

async function setAllocate() {
    await ddaoAllocV02.SaleModify(0, 'test', payer3.address, true, LEVEL_MIN_1, LEVEL_MIN_2, LEVEL_MIN_3, [usdcTest.address]);
    await ddaoAllocV02.SaleEnabled(0);
}

async function preparePayer1ToAllocate() {
    await setAllocate()

    const amount = ethers.BigNumber.from(50000).mul(bn1e6);
    await usdcTest.approve(owner.address, amount);
    await usdcTest.transferFrom(owner.address, payer1.address, amount);
    await usdcTest.connect(payer1).approve(ddaoAllocV02.address, amount);
}

describe("DDAOallocV02", function () {
    beforeEach(async function() {
        [owner, payer1, payer2, payer3] = await ethers.getSigners();

        DDAOallocV02 = await ethers.getContractFactory('DDAOallocV02');
        ERC20 = await ethers.getContractFactory('ERC20Base');

        ddaoAllocV02Inst = await DDAOAllocV02Contract.new();
        
        ddaoAllocV02 = await DDAOallocV02.deploy();

        usdcTest = await ERC20.deploy('Dev USDC (DEVUSDC)', 'USDC-Test', 6);
        await usdcTest.mint(owner.address, '10000000000000');
    })

    describe("constructor", function() {
        it("Should set default admin role", async function() {
            expect(await ddaoAllocV02.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.be.equal(true);
        });
    })

    describe("IsAdmin", function() {
        it("Should be false as payer1 is not admin", async function() {
            expect(await ddaoAllocV02.IsAdmin(payer1.address)).to.be.equal(false);
        });
        it("Should be false as owner is admin", async function() {
            expect(await ddaoAllocV02.IsAdmin(owner.address)).to.be.equal(true);
        });
    })

    describe("AdminAdd", function() {
        it("Should be reverted as payer1 is not admin", async function() {
            await truffleAssert.reverts(ddaoAllocV02.connect(payer1).AdminAdd(payer1.address), "Access for Admin's only")
        });
        it("Should be added new admin", async function() {
            const tx = await ddaoAllocV02Inst.AdminAdd(payer1.address);
            let result = await truffleAssert.createTransactionResult(ddaoAllocV02Inst, tx.receipt.transactionHash);
            
            truffleAssert.eventEmitted(result, 'adminModify', (ev) => {
                return ev.txt === 'Admin added' && ev.addr === payer1.address
            });
        });
        it("Should be reverted as payer1 has already been granted", async function() {
            await ddaoAllocV02.AdminAdd(payer1.address);
            await truffleAssert.reverts(ddaoAllocV02.AdminAdd(payer1.address), 'Account already ADMIN');
        });
    })
    
    describe("AdminDel", function() {
        it("Should be reverted as admin can't delete yourself", async function() {
            await ddaoAllocV02.AdminAdd(payer1.address);
            await truffleAssert.reverts(ddaoAllocV02.connect(payer1).AdminDel(payer1.address), 'You can`t remove yourself');
        })
        it("Should be reverted as payer2 is not admin", async function() {
            await truffleAssert.reverts(ddaoAllocV02.connect(payer2).AdminDel(payer1.address), "Access for Admin's only");
        })
        it("Should ve removed from admin", async function() {
            await ddaoAllocV02Inst.AdminAdd(payer1.address);
            const tx = await ddaoAllocV02Inst.AdminDel(payer1.address);
            let result = await truffleAssert.createTransactionResult(ddaoAllocV02Inst, tx.receipt.transactionHash);
            
            truffleAssert.eventEmitted(result, 'adminModify', (ev) => {
                return ev.txt === 'Admin deleted' && ev.addr === payer1.address
            });
        })
        it("Should be reverted as user is not admin", async function() {
            await truffleAssert.reverts(ddaoAllocV02.AdminDel(payer1.address), "Account not ADMIN");
        })
    })

    describe("TokenAllowance", function() {
        it("Should be 0", async function() {
            expect((await ddaoAllocV02.TokenAllowance(usdcTest.address, payer1.address)).toString()).to.be.equal('0');
        })
        it("Should be more then 0", async function() {
            await usdcTest.connect(payer1).approve(ddaoAllocV02.address, ethers.BigNumber.from(50000).mul(bn1e6));
            expect((await ddaoAllocV02.TokenAllowance(usdcTest.address, payer1.address)).toNumber()).to.be.greaterThan(0);
        })
    })

    describe("TokenInfo", function() {
        it("Should return token info", async function() {
            const info = await ddaoAllocV02.TokenInfo(usdcTest.address);

            expect(info[0]).to.not.equal(+usdcTest.address);
            expect(info[1]).to.be.equal(6);
            expect(info[2]).to.be.equal('Dev USDC (DEVUSDC)');
            expect(info[3]).to.be.equal('USDC-Test');
            expect(info[4].toString()).to.be.equal('10000000000000');
        })
    })

    describe("SaleModify", function() {
        it("Should be revetred as payer1 is not admin", async function() {
            await truffleAssert.reverts(ddaoAllocV02.connect(payer1).SaleModify(0, 'Sale', ZERRO, true, LEVEL_MIN_1, LEVEL_MIN_2, LEVEL_MIN_3, [usdcTest.address]), "Access for Admin's only");
        })
        it("Should be modified", async function() {
            await ddaoAllocV02.SaleModify(1, 'Sale', ZERRO, true, LEVEL_MIN_1, LEVEL_MIN_2, LEVEL_MIN_3, [usdcTest.address]);
            expect(((await ddaoAllocV02.Sale(1))[0]).toNumber()).to.be.equal(1);
        })
    })

    describe("SaleEnable", function() {
        it("Should be revetred as payer1 is not admin", async function() {
            await truffleAssert.reverts(ddaoAllocV02.connect(payer1).SaleEnable(0, true), "Access for Admin's only");
        })
        it("Should be disabled sale", async function() {
            await ddaoAllocV02.SaleEnable(0, true);
            expect((await ddaoAllocV02.Sale(0))[1]).to.be.equal(true);
        })
    })

    describe("SaleEnabled", function() {
        it("Should return disabled status", async function() {
            expect(await ddaoAllocV02.SaleEnabled(0)).to.be.equal(false);
        })
    })

    describe("Allocate", function() {
        it("Should be reverted as ID is disabled", async function() {
            await ddaoAllocV02.SaleEnable(0, false);
            await truffleAssert.reverts(ddaoAllocV02.Allocate(0, 0, ZERRO, ethers.BigNumber.from(50000).mul(bn1e6), 0), "Sale with this ID is disabled");
        })
        it("Should be reverted as not enought tokens", async function() {
            await ddaoAllocV02.SaleModify(0, 'test', payer3.address, true, LEVEL_MIN_1, LEVEL_MIN_2, LEVEL_MIN_3, [usdcTest.address]);
            await truffleAssert.reverts(ddaoAllocV02.connect(payer1).Allocate(0, 0, ZERRO, ethers.BigNumber.from(50000).mul(bn1e6), 0), "Not enough tokens to receive");
        })
        it("Should be reverted as token ID is not exist", async function() {
            await ddaoAllocV02.SaleModify(0, 'test', payer3.address, true, LEVEL_MIN_1, LEVEL_MIN_2, LEVEL_MIN_3, [usdcTest.address]);
            await truffleAssert.reverts(ddaoAllocV02.connect(payer1).Allocate(0, 0, ZERRO, ethers.BigNumber.from(50000).mul(bn1e6), 1), "VM Exception while processing transaction: reverted with panic code 0x32 (Array accessed at an out-of-bounds or negative index)");
        })
        it("Should be reverted as token is not approved", async function() {
            await ddaoAllocV02.SaleModify(0, 'test', payer3.address, true, LEVEL_MIN_1, LEVEL_MIN_2, LEVEL_MIN_3, [usdcTest.address]);
            await truffleAssert.reverts(ddaoAllocV02.Allocate(0, 0, ZERRO, ethers.BigNumber.from(50000).mul(bn1e6), 0), "You need to be allowed to use tokens to pay for this contract [We are wait approve]");
        })
        it("Should be reverted as amount less than level min", async function() {
            await setAllocate();
            await usdcTest.approve(ddaoAllocV02.address, ethers.BigNumber.from(2500).mul(bn1e6));
            await truffleAssert.reverts(ddaoAllocV02.Allocate(0, 3, payer2.address, ethers.BigNumber.from(1).mul(bn1e6), 0), "Amount must be more then LevelMin for this level");
        })

        it("Should be added next AllocCount", async function() {
            await preparePayer1ToAllocate();
            await ddaoAllocV02.connect(payer1).Allocate(0, 0, payer2.address, ethers.BigNumber.from(25).mul(bn1e6), 0);
            expect((await ddaoAllocV02.AllocCount()).toNumber()).to.be.equal(1);
        })

        it("Should be concatenated prev amount with new in AllocAmount", async function() {
            await preparePayer1ToAllocate();
            const preAllocAmount = await ddaoAllocV02.AllocSaleAmount(0);
            const amount = ethers.BigNumber.from(25).mul(bn1e6);
            await ddaoAllocV02.connect(payer1).Allocate(0, 0, payer2.address, amount, 0);
            const newAllocAmount = ethers.BigNumber.from(preAllocAmount).add(amount).toNumber();
            expect((await ddaoAllocV02.AllocSaleAmount(0)).toNumber()).to.be.equal(newAllocAmount);
        })

        it("Should be changed AllocSale.. and left part should be different with right", async function() {
            await preparePayer1ToAllocate();
            const sale = 0;
            const level = 0;
            const amount = ethers.BigNumber.from(25).mul(bn1e6);

            const leftAllocSaleCount = await ddaoAllocV02.AllocSaleCount(sale);
            const leftAllocSaleAmount = await ddaoAllocV02.AllocSaleAmount(sale);
            const leftAllocSaleLevelCount = await ddaoAllocV02.AllocSaleLevelCount(sale, level);
            const leftAllocSaleLevelAmount = await ddaoAllocV02.AllocSaleLevelAmount(sale, level);
            
            await ddaoAllocV02.connect(payer1).Allocate(sale, level, payer2.address, amount, 0);
            const rightAllocSaleCount = await ddaoAllocV02.AllocSaleCount(sale);
            const rightAllocSaleAmount = await ddaoAllocV02.AllocSaleAmount(sale);
            const rightAllocSaleLevelCount = await ddaoAllocV02.AllocSaleLevelCount(sale, level);
            const rightAllocSaleLevelAmount = await ddaoAllocV02.AllocSaleLevelAmount(sale, level);

            expect(rightAllocSaleCount.toNumber()).to.be.greaterThan(leftAllocSaleCount.toNumber());
            expect(rightAllocSaleAmount.toNumber()).to.be.equal(leftAllocSaleAmount.toNumber() + amount.toNumber());
            expect(rightAllocSaleLevelCount.toNumber()).to.be.equal(leftAllocSaleLevelCount.toNumber() + 1);
            expect(rightAllocSaleLevelAmount.toNumber()).to.be.equal(leftAllocSaleLevelAmount.toNumber() + amount.toNumber());
        })

        it("Sould be sent token from sender", async function() {
            await preparePayer1ToAllocate();
            const sale = 0;
            const level = 0;

            const balanceOfBefore = await usdcTest.balanceOf(payer1.address);
            const amount = ethers.BigNumber.from(25).mul(bn1e6);
            
            await ddaoAllocV02.connect(payer1).Allocate(sale, level, payer2.address, amount, 0);
            
            const balanceOfAfter = await usdcTest.balanceOf(payer1.address);
            expect(balanceOfAfter.toNumber()).to.be.equal(balanceOfBefore.sub(amount).toNumber());
        })

        it("Should be participated in 3 levels of sale", async function() {
            await preparePayer1ToAllocate();
            const saleID = 0;
            await ddaoAllocV02Inst.SaleModify(saleID, 'Sale', payer3.address, true, LEVEL_MIN_1, LEVEL_MIN_2, LEVEL_MIN_3, [usdcTest.address]);

            const minAmountLevel1 = ethers.BigNumber.from(LEVEL_MIN_1).mul(bn1e6);
            const minAmountLevel2 = ethers.BigNumber.from(LEVEL_MIN_2).mul(bn1e6);
            const minAmountLevel3 = ethers.BigNumber.from(LEVEL_MIN_3).mul(bn1e6);

            await ddaoAllocV02.connect(payer1).Allocate(saleID, 1, payer1.address, minAmountLevel1, 0);
            await ddaoAllocV02.connect(payer1).Allocate(saleID, 2, payer1.address, minAmountLevel2, 0);
            await ddaoAllocV02.connect(payer1).Allocate(saleID, 3, payer1.address, minAmountLevel3, 0);

            expect((await ddaoAllocV02.AllocSaleCount(saleID)).toNumber()).to.be.equal(3);
        })

        it("Sould be add event after sale", async function() {
            const sale = 0;
            const level = 0;
            const amount = ethers.BigNumber.from(25).mul(bn1e6);

            await ddaoAllocV02Inst.SaleModify(0, 'Sale', payer2.address, true, LEVEL_MIN_1, LEVEL_MIN_2, LEVEL_MIN_3, [usdcTest.address]);
            await usdcTest.approve(ddaoAllocV02Inst.address, amount);

            const tx = await ddaoAllocV02Inst.Allocate(sale, level, payer2.address, amount, 0);
            let result = await truffleAssert.createTransactionResult(ddaoAllocV02Inst, tx.receipt.transactionHash);
            
            truffleAssert.eventEmitted(result, 'DDAOAllocate', (ev) => {
                return ev.number.toNumber() == 1 && ev.payer == owner.address && ev.addr == payer2.address && ev.sale.toNumber() == sale && ev.level.toNumber() === level && ev.amount.toNumber() === amount.toNumber();
            });
        })

        describe("LevelMin", function() {
            it("Should return in level 1 value of LEVEL_MIN_1", async function() {
                const saleID = 1;
                await ddaoAllocV02.SaleModify(saleID, 'Sale', payer3.address, true, LEVEL_MIN_1, LEVEL_MIN_2, LEVEL_MIN_3, [usdcTest.address]);
    
                expect((await ddaoAllocV02.LevelMin(saleID, 1)).toNumber()).to.be.equal(LEVEL_MIN_1);
            })
        })
    })
})

