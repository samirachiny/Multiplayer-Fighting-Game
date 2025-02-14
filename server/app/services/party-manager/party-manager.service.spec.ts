/* eslint-disable max-lines */
/* eslint-disable @typescript-eslint/no-explicit-any */
// test/party-manager.service.spec.ts

import { expect } from 'chai';
import * as sinon from 'sinon';
import * as io from 'socket.io';
import { PartyManagerService } from '@app/services/party-manager/party-manager.service'; // Adjust the import path
import { PartyHelper } from '@app/classes/party-helper/party-helper';
import { WsEventClient } from '@common/enums/web-socket-event';
import { Coordinate } from '@common/interfaces/coordinate';
import * as partyManagerModule from '@app/classes/party-manager/party-manager';
import { FightParticipants } from '@common/interfaces/fight-participants';
import { ItemType } from '@common/enums/item';
import { PartyService } from '@app/services/party/party.service';
import { PartyStatisticsService } from '@app/services/party-statistics/party-statistics.service';

describe('PartyManagerService', () => {
    let partyManagerService: PartyManagerService;
    let sioStub: any;
    let socketStub: any;
    let partyManagerStub: sinon.SinonStubbedInstance<partyManagerModule.PartyManager>;
    let partyServiceStub: sinon.SinonStubbedInstance<PartyService>;
    let partyStatServiceStub: sinon.SinonStubbedInstance<PartyStatisticsService>;
    let partyId: string;
    let socketId: string;
    beforeEach(() => {
        // Stubbing dependencies
        sioStub = {
            to: sinon.stub().returns(sioStub),
            in: sinon.stub().returns(sioStub),
            socketsLeave: sinon.stub().returns(sioStub),
            emit: sinon.stub().returns(sioStub),
            on: sinon.stub().returns(sioStub),
            socketsJoin: sinon.stub().returns(sioStub),
        };
        socketStub = {
            to: sinon.stub().returns(socketStub),
            in: sinon.stub().returns(socketStub),
            socketsLeave: sinon.stub().returns(socketStub),
            emit: sinon.stub().returns(socketStub),
            on: sinon.stub().returns(socketStub),
            join: sinon.stub().returns(socketStub),
            socketsJoin: sinon.stub().returns(socketStub),
        };
        PartyHelper.init(sioStub);
        partyManagerStub = sinon.createStubInstance(partyManagerModule.PartyManager);
        partyServiceStub = sinon.createStubInstance(PartyService);
        partyStatServiceStub = sinon.createStubInstance(PartyStatisticsService);
        partyId = 'test-party-id';
        socketId = 'test-socket-id';
        socketStub.id = socketId;
        sinon.stub(PartyHelper, 'getPartyId').returns(partyId);
        // Stubbing sio.to().emit()
        const emitStub = sinon.stub();
        sioStub.to.returns({ emit: emitStub });
        // Initializing PartyManagerService
        partyManagerService = new PartyManagerService(partyStatServiceStub, partyServiceStub);
        partyManagerService['partyManagers'] = new Map<string, partyManagerModule.PartyManager>();
    });
    afterEach(() => {
        sinon.restore();
    });

    describe('startGame()', () => {
        it('should not start a new game if partyManager already exists', () => {
            partyManagerService['partyManagers'].set(partyId, partyManagerStub as unknown as partyManagerModule.PartyManager);
            partyManagerService.startGame(socketStub as unknown as io.Socket);

            expect(sioStub.to.called).to.equal(false);
            expect(partyManagerStub.startGame.called).to.equal(false);
        });

        it('should start a new game and create a PartyManager if not existing', () => {
            // Stub the PartyManager class constructor
            const partyManagerConstructorStub = sinon
                .stub(partyManagerModule, 'PartyManager')
                .returns(partyManagerStub as unknown as partyManagerModule.PartyManager);

            partyManagerService.startGame(socketStub as unknown as io.Socket);

            expect(sioStub.to(partyId).emit.calledWith(WsEventClient.StartGame)).to.equal(true);
            expect(partyManagerService['partyManagers'].has(partyId)).to.equal(true);
            // Restore the stub
            partyManagerConstructorStub.restore();
        });
    });

    describe('getPartyManager()', () => {
        it('should return the existing PartyManager', () => {
            partyManagerService['partyManagers'].set(partyId, partyManagerStub as unknown as partyManagerModule.PartyManager);
            const result = partyManagerService.getPartyManager(socketStub as unknown as io.Socket);
            expect(result).to.equal(partyManagerStub);
        });

        it('should return undefined if no PartyManager exists', () => {
            const result = partyManagerService.getPartyManager(socketStub as unknown as io.Socket);
            expect(result).to.equal(undefined);
        });
    });

    describe('getPartyInfos()', () => {
        it('should call getPartyInfos on the PartyManager', () => {
            const callbackStub = sinon.stub();
            partyManagerService['partyManagers'].set(partyId, partyManagerStub as unknown as partyManagerModule.PartyManager);
            partyManagerService.getPartyInfos(socketStub as unknown as io.Socket, callbackStub);
            expect(partyManagerStub.getPartyInfos.calledWith(callbackStub)).to.equal(true);
        });

        it('should not throw if no PartyManager exists', () => {
            const callbackStub = sinon.stub();
            expect(() => partyManagerService.getPartyInfos(socketStub as unknown as io.Socket, callbackStub)).to.not.throw();
        });
    });

    describe('getAccessiblePositions()', () => {
        it('should call getAccessiblePositions on the PartyManager', () => {
            const callbackStub = sinon.stub();
            const positions: Coordinate[] = [{ x: 0, y: 0 }];

            partyManagerStub.getAccessiblePositions.returns(positions);
            partyManagerService['partyManagers'].set(partyId, partyManagerStub as unknown as partyManagerModule.PartyManager);
            partyManagerService.getAccessiblePositions(socketStub as unknown as io.Socket, callbackStub);

            expect(partyManagerStub.getAccessiblePositions.calledWith(socketId)).to.equal(true);
            expect(callbackStub.calledWith(positions)).to.equal(true);
        });

        it('should not throw if no PartyManager exists', () => {
            const callbackStub = sinon.stub();
            expect(() => partyManagerService.getAccessiblePositions(socketStub as unknown as io.Socket, callbackStub)).to.not.throw();
        });
    });

    describe('getInteractablePositions()', () => {
        it('should call getInteractablePositions on the PartyManager', () => {
            const callbackStub = sinon.stub();
            const positions: Coordinate[] = [{ x: 0, y: 0 }];

            partyManagerStub.getInteractivePositions.returns(positions);
            partyManagerService['partyManagers'].set(partyId, partyManagerStub as unknown as partyManagerModule.PartyManager);
            partyManagerService.getInteractivePositions(socketStub as unknown as io.Socket, callbackStub);

            expect(partyManagerStub.getInteractivePositions.calledWith(socketId)).to.equal(true);
            expect(callbackStub.calledWith(positions)).to.equal(true);
        });

        it('should not throw if no PartyManager exists', () => {
            const callbackStub = sinon.stub();
            expect(() => partyManagerService.getInteractivePositions(socketStub as unknown as io.Socket, callbackStub)).to.not.throw();
        });
    });

    describe('getFighters()', () => {
        it('should call getFighters on the PartyManager and invoke callback with the result', () => {
            const callbackStub = sinon.stub();
            const fightersData: FightParticipants = {
                attacker: {
                    pid: 'player1',
                    name: 'Player 1',
                    character: undefined,
                    speed: 0,
                    attack: 0,
                    defense: 0,
                    life: 0,
                    remainEscape: 0,
                    diceAssignment: undefined,
                },
                defender: {
                    pid: 'player2',
                    name: 'Player 2',
                    character: undefined,
                    speed: 0,
                    attack: 0,
                    defense: 0,
                    life: 0,
                    remainEscape: 0,
                    diceAssignment: undefined,
                },
            };

            partyManagerStub.getFighters.returns(fightersData);
            partyManagerService['partyManagers'].set(partyId, partyManagerStub as unknown as partyManagerModule.PartyManager);
            partyManagerService.getFighters(socketStub as unknown as io.Socket, callbackStub);
            expect(partyManagerStub.getFighters.calledOnce).to.equal(true);
            expect(callbackStub.calledOnceWithExactly(fightersData)).to.equal(true);
        });

        it('should not throw and not call callback if PartyManager does not exist', () => {
            const callbackStub = sinon.stub();
            partyManagerService['partyManagers'].delete(partyId);
            expect(() => {
                partyManagerService.getFighters(socketStub as unknown as io.Socket, callbackStub);
            }).to.not.throw();
            expect(callbackStub.notCalled).to.equal(true);
        });
    });

    describe('getPath()', () => {
        it('should call getPath on the PartyManager', () => {
            const callbackStub = sinon.stub();
            const endPosition: Coordinate = { x: 1, y: 1 };
            const path: Coordinate[] = [
                { x: 0, y: 0 },
                { x: 1, y: 1 },
            ];

            partyManagerStub.getPath.returns(path);
            partyManagerService['partyManagers'].set(partyId, partyManagerStub as unknown as partyManagerModule.PartyManager);
            partyManagerService.getPath(socketStub as unknown as io.Socket, endPosition, callbackStub);
            expect(partyManagerStub.getPath.calledWith(socketId, endPosition)).to.equal(true);
            expect(callbackStub.calledWith(path)).to.equal(true);
        });

        it('should not throw if no PartyManager exists', () => {
            const callbackStub = sinon.stub();
            const endPosition: Coordinate = { x: 1, y: 1 };

            expect(() => partyManagerService.getPath(socketStub as unknown as io.Socket, endPosition, callbackStub)).to.not.throw();
        });
    });

    describe('handleAttack()', () => {
        it('should call handleAttack on the PartyManager when it exists', async () => {
            partyManagerService['partyManagers'].set(partyId, partyManagerStub as unknown as partyManagerModule.PartyManager);
            await partyManagerService.handleAttack(socketStub as unknown as io.Socket);
            expect(partyManagerStub.handleAttack.calledOnce).to.equal(true);
        });

        it('should not throw and not call handleAttack if PartyManager does not exist', async () => {
            partyManagerService['partyManagers'].delete(partyId);
            await partyManagerService.handleAttack(socketStub as unknown as io.Socket);
            expect(partyManagerStub.handleAttack.notCalled).to.equal(true);
        });
    });

    describe('handleGiveUpInFight()', () => {
        it('should call handleGiveUpInFight on the PartyManager and delete PartyManager if it returns true', async () => {
            partyManagerStub.handleGiveUpInFight.withArgs(socketId).resolves(true);
            const deletePartyManagerSpy = sinon.spy(partyManagerService, 'deletePartyManager');
            partyManagerService['partyManagers'].set(partyId, partyManagerStub as any as partyManagerModule.PartyManager);
            await partyManagerService.handleGiveUpInFight(socketStub as any as io.Socket);
            expect(partyManagerStub.handleGiveUpInFight.calledWith(socketId)).to.equal(true);
            expect(deletePartyManagerSpy.calledWith(socketStub)).to.equal(true);
        });

        it('should call handleGiveUpInFight on the PartyManager and not delete PartyManager if it returns false', async () => {
            partyManagerStub.handleGiveUpInFight.withArgs(socketId).resolves(false);
            const deletePartyManagerSpy = sinon.spy(partyManagerService, 'deletePartyManager');
            partyManagerService['partyManagers'].set(partyId, partyManagerStub as any as partyManagerModule.PartyManager);
            await partyManagerService.handleGiveUpInFight(socketStub as any as io.Socket);
            expect(partyManagerStub.handleGiveUpInFight.calledWith(socketId)).to.equal(true);
            expect(deletePartyManagerSpy.notCalled).to.equal(true);
        });

        it('should not throw and not call handleGiveUpInFight if PartyManager does not exist', async () => {
            partyManagerService['partyManagers'].delete(partyId);
            await partyManagerService.handleGiveUpInFight(socketStub as any as io.Socket);
            expect(partyManagerStub.handleGiveUpInFight.notCalled).to.equal(true);
        });
    });

    describe('handleEscape()', () => {
        it('should call handleEscape on the PartyManager when it exists', async () => {
            partyManagerService['partyManagers'].set(partyId, partyManagerStub as any as partyManagerModule.PartyManager);
            await partyManagerService.handleEscape(socketStub as any as io.Socket);
            expect(partyManagerStub.handleEscape.calledOnce).to.equal(true);
        });

        it('should not throw and not call handleEscape if PartyManager does not exist', async () => {
            partyManagerService['partyManagers'].delete(partyId);
            await partyManagerService.handleEscape(socketStub as any as io.Socket);
            expect(partyManagerStub.handleEscape.notCalled).to.equal(true);
        });
    });

    describe('removePlayerItem()', () => {
        it('should call removePlayerItem on the PartyManager when it exists', () => {
            partyManagerService['partyManagers'].set(partyId, partyManagerStub as any as partyManagerModule.PartyManager);
            const item: ItemType = ItemType.DoubleIceBreak;
            partyManagerService.removePlayerItem(socketStub as any as io.Socket, item);
            expect(partyManagerStub.removePlayerItem.calledOnce).to.equal(true);
            expect(partyManagerStub.removePlayerItem.calledWith(socketStub.id, item)).to.equal(true);
        });
        it('should not throw and not call removePlayerItem if PartyManager does not exist', () => {
            partyManagerService['partyManagers'].delete(partyId);
            const item: ItemType = ItemType.BoostAttack;
            expect(() => partyManagerService.removePlayerItem(socketStub as any as io.Socket, item)).to.not.throw();
            expect(partyManagerStub.removePlayerItem.notCalled).to.equal(true);
        });
    });

    describe('giveUp()', () => {
        it('should call giveUp on the PartyManager', () => {
            partyManagerService['partyManagers'].set(partyId, partyManagerStub as unknown as partyManagerModule.PartyManager);
            partyManagerService.giveUp(socketStub as unknown as io.Socket);
            expect(partyManagerStub.giveUp.calledWith(socketId)).to.equal(true);
        });

        it('should not throw if no PartyManager exists', () => {
            expect(() => partyManagerService.giveUp(socketStub as unknown as io.Socket)).to.not.throw();
        });

        it('should delete PartyManager when giveUp returns true', () => {
            partyManagerStub.giveUp.withArgs(socketId).returns(true);
            const deletePartyManagerSpy = sinon.spy(partyManagerService, 'deletePartyManager');

            partyManagerService['partyManagers'].set(partyId, partyManagerStub as unknown as partyManagerModule.PartyManager);

            partyManagerService.giveUp(socketStub as unknown as io.Socket);

            expect(partyManagerStub.giveUp.calledWith(socketId)).to.equal(true);
            expect(deletePartyManagerSpy.calledWith(socketStub)).to.equal(true);
        });

        it('should not delete PartyManager when giveUp returns false', () => {
            partyManagerStub.giveUp.withArgs(socketId).returns(false);
            const deletePartyManagerSpy = sinon.spy(partyManagerService, 'deletePartyManager');
            partyManagerService['partyManagers'].set(partyId, partyManagerStub as unknown as partyManagerModule.PartyManager);
            partyManagerService.giveUp(socketStub as unknown as io.Socket);
            expect(partyManagerStub.giveUp.calledWith(socketId)).to.equal(true);
            expect(deletePartyManagerSpy.notCalled).to.equal(true);
        });
    });

    describe('executeAction()', () => {
        it('should call executeAction on the PartyManager', () => {
            const position: Coordinate = { x: 1, y: 1 };
            partyManagerService['partyManagers'].set(partyId, partyManagerStub as unknown as partyManagerModule.PartyManager);
            partyManagerService.executeAction(socketStub as unknown as io.Socket, position);
            expect(partyManagerStub.executeAction.calledWith(socketId, position)).to.equal(true);
        });

        it('should not throw if no PartyManager exists', () => {
            const position: Coordinate = { x: 1, y: 1 };

            expect(() => partyManagerService.executeAction(socketStub as unknown as io.Socket, position)).to.not.throw();
        });
    });

    describe('movePlayer()', () => {
        it('should call movePlayer on the PartyManager', async () => {
            const finalPosition: Coordinate = { x: 2, y: 2 };
            partyManagerStub.movePlayer.resolves();
            partyManagerService['partyManagers'].set(partyId, partyManagerStub as unknown as partyManagerModule.PartyManager);
            await partyManagerService.movePlayer(socketStub as unknown as io.Socket, finalPosition);
            expect(partyManagerStub.movePlayer.calledWith(socketId, finalPosition)).to.equal(true);
        });

        it('should not throw if no PartyManager exists', async () => {
            const finalPosition: Coordinate = { x: 2, y: 2 };
            try {
                await partyManagerService.movePlayer(socketStub as unknown as io.Socket, finalPosition);
            } catch (error) {
                expect.fail("La promesse a été rejetée alors qu'elle ne devait pas l'être");
            }

            // await expect(partyManagerService.movePlayer(socketStub as unknown as io.Socket, finalPosition)).to.not.be.rejected;
        });
    });

    describe('teleportPlayerTo()', () => {
        it('should call teleportPlayerTo on the PartyManager', () => {
            const pos = { x: 1, y: 1 };
            partyManagerService['partyManagers'].set(partyId, partyManagerStub as unknown as partyManagerModule.PartyManager);
            partyManagerService.teleportPlayerTo(socketStub as unknown as io.Socket, pos);
            expect(partyManagerStub.teleportPlayerTo.calledWith(socketId, pos)).to.equal(true);
        });

        it('should not throw if no PartyManager exists', () => {
            const pos = { x: 1, y: 1 };
            expect(() => partyManagerService.teleportPlayerTo(socketStub as unknown as io.Socket, pos)).to.not.throw();
        });
    });

    describe('endRound()', () => {
        it('should call endRound on the PartyManager', () => {
            partyManagerService['partyManagers'].set(partyId, partyManagerStub as unknown as partyManagerModule.PartyManager);
            partyManagerService.endRound(socketStub as unknown as io.Socket);
            expect(partyManagerStub.endRound.calledWith(socketId)).to.equal(true);
        });

        it('should not throw if no PartyManager exists', () => {
            expect(() => partyManagerService.endRound(socketStub as unknown as io.Socket)).to.not.throw();
        });
    });

    describe('toggleDebugMode()', () => {
        it('should call toggleDebugMode on the PartyManager', () => {
            partyManagerService['partyManagers'].set(partyId, partyManagerStub as unknown as partyManagerModule.PartyManager);
            partyManagerService.toggleDebugMode(socketStub as unknown as io.Socket);
            expect(partyManagerStub.toggleDebugMode.called).to.equal(true);
        });

        it('should not throw if no PartyManager exists', () => {
            expect(() => partyManagerService.toggleDebugMode(socketStub as unknown as io.Socket)).to.not.throw();
        });
    });

    describe('deletePartyManager()', () => {
        it('should call destroy on the PartyManager and delete it from partyManagers when it exists', () => {
            const partyId_ = 'test-party-id';
            const socketStub_ = { id: 'socket-id' } as any as io.Socket;
            partyManagerStub = sinon.createStubInstance(partyManagerModule.PartyManager);
            partyManagerService['partyManagers'].set(partyId_, partyManagerStub);
            sinon.stub(partyManagerService, 'getPartyManager').withArgs(socketStub_).returns(partyManagerStub);
            partyManagerService.deletePartyManager(socketStub_);
            expect(partyManagerStub.destroy.calledOnce).to.equal(true);
            expect(partyManagerService['partyManagers'].has(partyId_)).to.equal(false);
        });

        it('should not throw and should not call destroy or delete when PartyManager does not exist', () => {
            const socketStubTest = { id: 'socket-id' } as any as io.Socket;
            sinon.stub(partyManagerService, 'getPartyManager').withArgs(socketStubTest).returns(undefined);
            const deleteSpy = sinon.spy(partyManagerService['partyManagers'], 'delete');
            partyManagerService.deletePartyManager(socketStubTest);
            expect(deleteSpy.notCalled).to.equal(true);
        });
    });
});
