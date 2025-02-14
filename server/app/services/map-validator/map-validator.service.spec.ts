/* eslint-disable max-lines */
/* eslint-disable no-unused-expressions */
/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-magic-numbers */
import * as mockPositions from '@app/utils/data';
import { Coordinate } from '@common/interfaces/coordinate';
import { expect } from 'chai';
import { MapValidator } from './map-validator.service';
import { BASE_TILE_DECIMAL } from '@app/utils/const';
import { ItemType } from '@common/enums/item';

describe('MapValidator Class', () => {
    const mockValidator: MapValidator = new MapValidator();
    /**
     * Modifie une tuile de la carte pour faciliter la création de scénarios de test.
     *
     * Cette fonction permet de changer la valeur d'une tuile à une position donnée,
     * ce qui est utile pour simuler différentes configurations de la carte lors des
     * tests unitaires.
     *
     * **Attention :** Cette méthode ne doit être utilisée que dans le contexte de
     * tests et ne fait pas partie de la logique principale de l'application.
     * Assurez-vous que les modifications apportées par cette fonction ne perturbent
     * pas l'intégrité de la carte dans d'autres parties de l'application.
     *
     * @param {Coordinate} position - La position de la tuile à modifier, spécifiée par
     *                                 un objet contenant les coordonnées `x` et `y`.
     * @param {number} value - La nouvelle valeur à attribuer à la tuile, qui peut
     *                         représenter différents états (par exemple, mur, porte, etc.).
     */
    function setTile(position: Coordinate, value: number): void {
        (mockValidator['mapManager'] as any).map[position.y][position.x] = value;
    }

    beforeEach(() => {
        mockValidator.setMap(
            Array(20)
                .fill(null)
                .map(() => Array(20).fill(10)),
        );
    });

    describe('Visited and Queued positions identification', () => {
        it('isVisited and isQueued should correctly identify visited and queued positions', () => {
            mockPositions.VALID_POSITIONS.forEach((position) => {
                expect((mockValidator as any).isVisited(position)).to.be.false;
                expect((mockValidator as any).isQueued(position)).to.be.false;
                mockValidator['visited'].push(position);
                mockValidator['queue'].push(position);
                expect((mockValidator as any).isVisited(position)).to.be.true;
                expect((mockValidator as any).isQueued(position)).to.be.true;
            });
        });

        it('isAnyNotVisited should return true if at least one of the positions has not been visited', () => {
            mockPositions.VALID_POSITIONS.forEach((position) => {
                mockValidator['visited'].push(position);
            });
            const isAnyNotVisited = (mockValidator as any).isAnyNotVisited([
                mockPositions.VALID_POSITIONS[1],
                mockPositions.VALID_POSITIONS[0],
                mockPositions.VALID_POSITIONS[2],
                { x: 11, y: 11 },
            ]);
            expect(isAnyNotVisited).to.be.true;
        });

        it('isAnyNotVisited should return false if all the positions have been visited', () => {
            mockPositions.VALID_POSITIONS.forEach((position) => {
                mockValidator['visited'].push(position);
            });
            expect((mockValidator as any).isAnyNotVisited(mockPositions.MIDDLE_POSITIONS)).to.be.false;
        });
    });

    describe('Map analysis', () => {
        it('should analyze tiles and update freeTiles accordingly', () => {
            const initFreeTiles = mockValidator['freeTiles'];
            mockPositions.VALID_POSITIONS.forEach((position) => {
                setTile(position, 0);
                (mockValidator as any).analyzeTile(position);
            });

            expect(mockValidator['freeTiles']).to.equal(initFreeTiles - mockPositions.VALID_POSITIONS.length);
        });

        it('should analyze tiles and update doorPositions accordingly', () => {
            mockPositions.VALID_POSITIONS.forEach((position, index) => {
                (mockValidator['mapManager'] as any).map[position.y][position.x] = 50;
                (mockValidator as any).analyzeTile(position);
                const isEqual = mockValidator['mapManager'].equals(mockValidator['doorPositions'][index], position);
                expect(isEqual).to.equal(true);
            });
        });

        it('should analyze the map and update doorPositions and freeTiles accordingly', () => {
            const initFreeTiles = mockValidator['freeTiles'];
            mockPositions.MIDDLE_POSITIONS.forEach((position) => {
                setTile(position, 0);
            });

            mockPositions.BOUNDARY_POSITIONS.forEach((position) => {
                setTile(position, 50);
            });

            (mockValidator as any).analyzeMap();
            expect(mockValidator['freeTiles']).to.equal(initFreeTiles - mockPositions.MIDDLE_POSITIONS.length);
            expect(mockValidator['doorPositions']).to.have.lengthOf(mockPositions.BOUNDARY_POSITIONS.length);
        });

        it('getStartPosition should return the first free Position', () => {
            setTile({ x: 0, y: 0 }, 0);
            setTile({ x: 1, y: 0 }, 0);
            setTile({ x: 2, y: 0 }, 0);
            setTile({ x: 3, y: 0 }, 0);

            const startPosition = (mockValidator as any).getStartPosition();
            expect(startPosition).to.deep.equal({ x: 4, y: 0 });
        });

        it('getStartPosition should return null if there is no free position', () => {
            mockValidator.setMap(
                Array(20)
                    .fill(null)
                    .map(() => Array(20).fill(0)),
            );
            expect((mockValidator as any).getStartPosition()).to.be.null;
        });
    });

    describe('Path finding tests', () => {
        function resetMap(): void {
            mockValidator.setMap(
                Array(20)
                    .fill(null)
                    .map(() => Array(20).fill(10)),
            );
        }

        it('runBFS should return true in an empty map', () => {
            expect((mockValidator as any).runBFS()).to.equal(true);
        });

        it('runBFS should return false if there is no start Position', () => {
            mockValidator.setMap(
                Array(20)
                    .fill(null)
                    .map(() => Array(20).fill(0)),
            );
            expect((mockValidator as any).runBFS()).to.equal(false);
        });

        it('should find a path in an obstructed diagonally but accessible map', () => {
            for (let i = 0; i < 18; i++) {
                setTile({ x: i, y: i }, 0);
            }
            expect((mockValidator as any).runBFS()).to.equal(true);

            resetMap();

            for (let i = 0; i < 18; i++) {
                setTile({ x: 10, y: i }, 0);
            }
            for (let i = 0; i < 7; i++) {
                setTile({ x: i, y: 10 }, 0);
            }
            expect((mockValidator as any).runBFS()).to.equal(true);
        });

        it('should not find a path in an obstructed part of the map', () => {
            setTile({ x: 1, y: 0 }, 0);
            setTile({ x: 0, y: 1 }, 0);

            expect((mockValidator as any).runBFS()).to.equal(false);

            setTile({ x: 1, y: 0 }, 10);
            setTile({ x: 0, y: 1 }, 10);

            for (let i = 0; i < 10; i++) {
                setTile({ x: 10, y: i }, 0);
                setTile({ x: i, y: 10 }, 0);
            }
            expect((mockValidator as any).runBFS()).to.equal(false);
            resetMap();

            for (let i = 0; i < mockValidator['mapManager'].size; i++) {
                setTile({ x: i, y: i }, 0);
            }
            expect((mockValidator as any).runBFS()).to.equal(false);
            resetMap();

            for (let i = 0; i < 10; i++) {
                setTile({ x: 10, y: i }, 0);
            }

            for (let i = 10; i < mockValidator['mapManager'].size; i++) {
                setTile({ x: i, y: i }, 0);
            }
            expect((mockValidator as any).runBFS()).to.equal(false);
        });
    });

    describe('Door Validation', () => {
        it('isDoorValid should return false if a door is on edge of the map', () => {
            setTile({ x: 0, y: 0 }, 0);
            setTile({ x: 1, y: 0 }, 50);
            setTile({ x: 2, y: 0 }, 0);
            expect((mockValidator as any).isDoorValid({ x: 1, y: 0 })).to.equal(false);

            setTile({ x: 2, y: 2 }, 0);
            setTile({ x: 2, y: 1 }, 50);
            expect((mockValidator as any).isDoorValid({ x: 2, y: 1 })).to.equal(true);

            setTile({ x: 0, y: 2 }, 0);
            setTile({ x: 0, y: 1 }, 50);
            expect((mockValidator as any).isDoorValid({ x: 0, y: 1 })).to.equal(false);

            setTile({ x: 0, y: 19 }, 0);
            setTile({ x: 1, y: 19 }, 50);
            setTile({ x: 2, y: 19 }, 0);
            expect((mockValidator as any).isDoorValid({ x: 1, y: 19 })).to.equal(false);

            setTile({ x: 19, y: 0 }, 0);
            setTile({ x: 19, y: 1 }, 50);
            setTile({ x: 19, y: 2 }, 0);
            expect((mockValidator as any).isDoorValid({ x: 19, y: 1 })).to.equal(false);
        });

        /* it('validateDoors should verify the integrity of all doors and update anomalousPositions', () => {
            setTile({ x: 0, y: 0 }, 0);
            setTile({ x: 1, y: 0 }, 0);
            setTile({ x: 3, y: 0 }, 0);
            setTile({ x: 0, y: 2 }, 0);
            setTile({ x: 1, y: 2 }, 0);
            setTile({ x: 3, y: 2 }, 0);
            setTile({ x: 2, y: 5 }, 0);
            setTile({ x: 2, y: 2 }, 50);

            mockValidator['doorPositions'] = [{ x: 2, y: 2 }];

            expect((mockValidator as any).validateDoors()).to.equal(true);
            expect(mockValidator['anomalousPositions']).to.have.length(0);

            setTile({ x: 0, y: 0 }, 10);

            expect((mockValidator as any).validateDoors()).to.equal(false);
            expect(mockValidator['anomalousPositions']).to.have.length(1);
        }); */
    });

    describe('Free surface calculations', () => {
        it('should detect if a map has the correct percentage of minimum accessible tiles', () => {
            (mockValidator as any).analyzeMap();
            expect((mockValidator as any).isSurfaceValid()).to.equal(true);

            for (let i = 0; i < 10; i++) {
                for (let j = 0; j < 20; j++) {
                    setTile({ x: i, y: j }, 0);
                }
            }
            (mockValidator as any).analyzeMap();
            expect((mockValidator as any).isSurfaceValid()).to.equal(true);

            // Add an excessive wall
            setTile({ x: 19, y: 19 }, 0);

            (mockValidator as any).analyzeMap();
            expect((mockValidator as any).isSurfaceValid()).to.equal(false);
        });
    });

    describe('Item Validation', () => {
        it('item Identification', () => {
            mockPositions.VALID_POSITIONS.forEach((position) => {
                setTile(position, 15);
                expect((mockValidator as any).hasItem(position)).to.equal(true);
            });

            setTile({ x: 2, y: 2 }, 12);
            expect((mockValidator as any).hasItem({ x: 2, y: 2 })).to.equal(true);
        });

        it('individual starting point Identification', () => {
            mockPositions.VALID_POSITIONS.forEach((position) => {
                setTile(position, BASE_TILE_DECIMAL + ItemType.StartingPoint);
                expect((mockValidator as any).hasStartingPoint(position)).to.equal(true);
            });
            setTile({ x: 2, y: 2 }, BASE_TILE_DECIMAL + ItemType.Flag);
            expect((mockValidator as any).hasStartingPoint({ x: 2, y: 2 })).to.equal(false);
        });

        it('should analyze individual items and update itemCount and start positions accordingly', () => {
            setTile({ x: 2, y: 2 }, BASE_TILE_DECIMAL + ItemType.DoubleIceBreak);
            (mockValidator as any).analyzeItem({ x: 2, y: 2 });
            expect(mockValidator['itemCount']).to.equal(1);

            setTile({ x: 1, y: 1 }, BASE_TILE_DECIMAL + ItemType.Random);
            (mockValidator as any).analyzeItem({ x: 1, y: 1 });
            expect(mockValidator['itemCount']).to.equal(2);

            (mockValidator as any).analyzeItem({ x: 0, y: 0 });
            expect(mockValidator['itemCount']).to.equal(2);

            setTile({ x: 3, y: 3 }, BASE_TILE_DECIMAL + ItemType.StartingPoint);
            (mockValidator as any).analyzeItem({ x: 3, y: 3 });
            expect(mockValidator['startPoints']).to.equal(1);

            setTile({ x: 5, y: 5 }, BASE_TILE_DECIMAL + ItemType.StartingPoint);
            (mockValidator as any).analyzeItem({ x: 5, y: 5 });
            expect(mockValidator['startPoints']).to.equal(2);

            setTile({ x: 7, y: 7 }, BASE_TILE_DECIMAL + ItemType.Flag);
            (mockValidator as any).analyzeItem({ x: 7, y: 7 });
            expect((mockValidator as any).flagCount).to.equal(1);
        });

        it('analyze Items should scan the whole map and return the total amount of items', () => {
            mockPositions.MIDDLE_POSITIONS.forEach((position) => {
                setTile(position, BASE_TILE_DECIMAL + ItemType.DoubleIceBreak);
            });
            mockPositions.BOUNDARY_POSITIONS.forEach((position) => {
                setTile(position, BASE_TILE_DECIMAL + ItemType.StartingPoint);
            });
            (mockValidator as any).analyzeItems();

            expect(mockValidator['itemCount']).to.equal(mockPositions.MIDDLE_POSITIONS.length);
            expect(mockValidator['startPoints']).to.equal(mockPositions.BOUNDARY_POSITIONS.length);
        });
    });

    describe('MapValidator generateMapValidationResponse and isMapValid', () => {
        it('should return a valid response when all map info is valid', () => {
            const mapInfos = {
                isMapConnected: true,
                areDoorsValid: true,
                isMapSurfaceCorrect: true,
                areItemsPlaced: true,
                areStartingPointValid: true,
            };
            const response = (mockValidator as any).generateMapValidationResponse(mapInfos);

            expect(response.mapStatus).to.be.true;
            expect(response.blockedSection).to.be.empty;
            expect(response.invalidDoors).to.be.empty;
            expect(response.excessTiles).to.equal(0);
            expect(response.areItemsPlaced).to.be.true;
            expect(response.areStartingPointPlaced).to.be.true;
        });

        it('should return invalid response when map is not connected', () => {
            const mapInfos = {
                isMapConnected: false,
                areDoorsValid: true,
                isMapSurfaceCorrect: true,
                areItemsPlaced: true,
                areStartingPointValid: true,
            };
            mockValidator['visited'] = [
                { x: 1, y: 1 },
                { x: 2, y: 2 },
            ];
            const response = (mockValidator as any).generateMapValidationResponse(mapInfos);

            expect(response.mapStatus).to.be.false;
            expect(response.blockedSection).to.deep.equal([
                { x: 1, y: 1 },
                { x: 2, y: 2 },
            ]);
            expect(response.invalidDoors).to.be.empty;
            expect(response.excessTiles).to.equal(0);
            expect(response.areItemsPlaced).to.be.true;
            expect(response.areStartingPointPlaced).to.be.true;
        });

        it('should return invalid response when doors are invalid', () => {
            const mapInfos = {
                isMapConnected: true,
                areDoorsValid: false,
                isMapSurfaceCorrect: true,
                areItemsPlaced: true,
                areStartingPointValid: true,
            };
            mockValidator['anomalousPositions'] = [
                { x: 3, y: 3 },
                { x: 4, y: 4 },
            ];
            const response = (mockValidator as any).generateMapValidationResponse(mapInfos);

            expect(response.mapStatus).to.be.false;
            expect(response.blockedSection).to.be.empty;
            expect(response.invalidDoors).to.deep.equal([
                { x: 3, y: 3 },
                { x: 4, y: 4 },
            ]);
            expect(response.excessTiles).to.equal(0);
            expect(response.areItemsPlaced).to.be.true;
            expect(response.areStartingPointPlaced).to.be.true;
        });

        it('should return invalid response when map surface is incorrect', () => {
            const mapInfos = {
                isMapConnected: true,
                areDoorsValid: true,
                isMapSurfaceCorrect: false,
                areItemsPlaced: true,
                areStartingPointValid: true,
            };
            mockValidator['freeTiles'] = 150;
            const response = (mockValidator as any).generateMapValidationResponse(mapInfos);

            const expectedExcessTiles = (mockValidator['mapManager'].size * mockValidator['mapManager'].size) / 2 - mockValidator['freeTiles'];
            expect(response.mapStatus).to.be.false;
            expect(response.blockedSection).to.be.empty;
            expect(response.invalidDoors).to.be.empty;
            expect(response.excessTiles).to.equal(expectedExcessTiles);
            expect(response.areItemsPlaced).to.be.true;
            expect(response.areStartingPointPlaced).to.be.true;
        });

        it('should return invalid response when items are not placed', () => {
            const mapInfos = {
                isMapConnected: true,
                areDoorsValid: true,
                isMapSurfaceCorrect: true,
                areItemsPlaced: false,
                areStartingPointValid: true,
            };
            const response = (mockValidator as any).generateMapValidationResponse(mapInfos);

            expect(response.mapStatus).to.be.false;
            expect(response.blockedSection).to.be.empty;
            expect(response.invalidDoors).to.be.empty;
            expect(response.excessTiles).to.equal(0);
            expect(response.areItemsPlaced).to.be.false;
            expect(response.areStartingPointPlaced).to.be.true;
        });

        it('should return invalid response when starting points are invalid', () => {
            const mapInfos = {
                isMapConnected: true,
                areDoorsValid: true,
                isMapSurfaceCorrect: true,
                areItemsPlaced: true,
                areStartingPointValid: false,
            };
            const response = (mockValidator as any).generateMapValidationResponse(mapInfos);

            expect(response.mapStatus).to.be.false;
            expect(response.blockedSection).to.be.empty;
            expect(response.invalidDoors).to.be.empty;
            expect(response.excessTiles).to.equal(0);
            expect(response.areItemsPlaced).to.be.true;
            expect(response.areStartingPointPlaced).to.be.false;
        });

        it('should return invalid response when in flag mode and flag is not in map', () => {
            const mapInfos = {
                isMapConnected: true,
                areDoorsValid: true,
                isMapSurfaceCorrect: true,
                areItemsPlaced: true,
                areStartingPointValid: true,
                isFlagInMap: false,
            };
            (mockValidator as any).flagCount = 0;
            const response = (mockValidator as any).generateMapValidationResponse(mapInfos, true);

            expect(response.mapStatus).to.be.false;
            expect(response.isFlagInMap).to.be.false;
            expect(response.blockedSection).to.be.empty;
            expect(response.invalidDoors).to.be.empty;
            expect(response.excessTiles).to.equal(0);
            expect(response.areItemsPlaced).to.be.true;
            expect(response.areStartingPointPlaced).to.be.true;
        });

        it('should return valid response when in flag mode and flag is in map', () => {
            const mapInfos = {
                isMapConnected: true,
                areDoorsValid: true,
                isMapSurfaceCorrect: true,
                areItemsPlaced: true,
                areStartingPointValid: true,
                isFlagInMap: true,
            };
            (mockValidator as any).flagCount = 1;
            const response = (mockValidator as any).generateMapValidationResponse(mapInfos, true);

            expect(response.mapStatus).to.be.true;
            expect(response.isFlagInMap).to.be.true;
            expect(response.blockedSection).to.be.empty;
            expect(response.invalidDoors).to.be.empty;
            expect(response.excessTiles).to.equal(0);
            expect(response.areItemsPlaced).to.be.true;
            expect(response.areStartingPointPlaced).to.be.true;
        });

        it('should return true when map is valid and not in flag mode', () => {
            const mapInfos = {
                isMapConnected: true,
                areDoorsValid: true,
                isMapSurfaceCorrect: true,
                areItemsPlaced: true,
                areStartingPointValid: true,
            };
            const result = (mockValidator as any).isMapValid(mapInfos);

            expect(result).to.be.true;
        });

        it('should return false when map is invalid due to not connected', () => {
            const mapInfos = {
                isMapConnected: false,
                areDoorsValid: true,
                isMapSurfaceCorrect: true,
                areItemsPlaced: true,
                areStartingPointValid: true,
            };
            const result = (mockValidator as any).isMapValid(mapInfos);

            expect(result).to.be.false;
        });

        it('should return false when map is valid but flag is not in map in flag mode', () => {
            const mapInfos = {
                isMapConnected: true,
                areDoorsValid: true,
                isMapSurfaceCorrect: true,
                areItemsPlaced: true,
                areStartingPointValid: true,
                isFlagInMap: false,
            };
            const result = (mockValidator as any).isMapValid(mapInfos, true);

            expect(result).to.be.false;
        });
    });

    describe('Final map validation', () => {
        it('should generate the correct response if the map passes all the valid criterias or not', () => {
            for (let i = 0; i <= 5; i++) {
                setTile({ x: i, y: i }, 0);
            }

            for (let i = 1; i <= 8; i++) {
                setTile({ x: 7, y: i }, 0);
            }

            setTile({ x: 0, y: 7 }, 0);
            setTile({ x: 2, y: 6 }, 0);
            setTile({ x: 2, y: 7 }, 0);
            setTile({ x: 3, y: 5 }, 0);
            setTile({ x: 3, y: 8 }, 0);
            setTile({ x: 5, y: 8 }, 0);
            setTile({ x: 5, y: 9 }, 0);
            setTile({ x: 6, y: 5 }, 0);
            setTile({ x: 9, y: 2 }, 0);
            setTile({ x: 9, y: 7 }, 0);

            setTile({ x: 1, y: 7 }, 50);
            setTile({ x: 4, y: 8 }, 50);
            setTile({ x: 8, y: 2 }, 50);
            setTile({ x: 8, y: 7 }, 50);
            setTile({ x: 7, y: 6 }, 50);

            for (let i = 0; i < 6; i++) {
                setTile({ x: i, y: 10 }, BASE_TILE_DECIMAL + ItemType.Random);
            }

            for (let i = 0; i < 6; i++) {
                setTile({ x: i, y: 11 }, BASE_TILE_DECIMAL + ItemType.StartingPoint);
            }

            let message = (mockValidator as any).generateResponse();

            expect(message.mapStatus).to.equal(true);
            expect(message.blockedSection).to.have.lengthOf(0);
            expect(message.invalidDoors).to.have.lengthOf(0);
            expect(message.excessTiles).to.equal(0);
            expect(message.areItemsPlaced).to.equal(true);

            setTile({ x: 5, y: 8 }, 10);
            setTile({ x: 7, y: 5 }, 10);

            message = (mockValidator as any).generateResponse();

            expect(message.mapStatus).to.equal(false);
            expect(message.blockedSection).to.have.lengthOf(0);
            expect(message.invalidDoors).to.have.lengthOf(2);
            expect(message.excessTiles).to.equal(0);
            expect(message.areItemsPlaced).to.equal(true);
        });

        it('should generate the correct response if the map has a section blocked off or has too many wall tiles or not enough items', () => {
            // Cover 5 tiles with walls
            setTile({ x: 2, y: 0 }, 0);
            setTile({ x: 2, y: 1 }, 0);
            setTile({ x: 2, y: 2 }, 0);
            setTile({ x: 1, y: 2 }, 0);
            setTile({ x: 0, y: 2 }, 0);

            for (let i = 0; i < 6; i++) {
                setTile({ x: i, y: 10 }, BASE_TILE_DECIMAL + ItemType.Random);
            }

            for (let i = 0; i < 6; i++) {
                setTile({ x: i, y: 11 }, BASE_TILE_DECIMAL + ItemType.StartingPoint);
            }

            let message = (mockValidator as any).generateResponse();

            expect(message.mapStatus).to.equal(false);
            expect(message.blockedSection).to.have.lengthOf(4);
            expect(message.invalidDoors).to.have.lengthOf(0);
            expect(message.excessTiles).to.equal(0);
            expect(message.areItemsPlaced).to.equal(true);

            for (let i = 0; i < 20; i++) {
                for (let j = 10; j < 20; j++) {
                    setTile({ x: i, y: j }, 0);
                }
            }

            message = (mockValidator as any).generateResponse();
            expect(message.mapStatus).to.equal(false);
            expect(message.blockedSection).to.have.lengthOf(4);
            expect(message.invalidDoors).to.have.lengthOf(0);
            expect(message.excessTiles).to.equal(5);
            expect(message.areItemsPlaced).to.equal(false);
        });
    });
});
