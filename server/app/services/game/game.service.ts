import { DataBaseService } from '@app/services/database/database.service';
import { Service } from 'typedi';
import { DB_ENV } from '@app/utils/env';
import { BASE36, MAX_GAME_ID_LENGTH } from '@app/utils/const';
import { Game } from '@common/interfaces/game';
import { DeleteResult, InsertOneResult, UpdateResult } from 'mongodb';
import { ValidationResponse } from '@common/interfaces/response-infos';
import { GameValidationService } from '@app/services/game-validation/game-validation.service';
import { ValidationFeedback } from '@common/interfaces/validation-feedback';
import { ValidationParameter } from '@app/interfaces/validation-parameter';
@Service()
export class GameService {
    private counter: number = 0;

    constructor(
        private bdService: DataBaseService,
        private validationService: GameValidationService,
    ) {}

    get collection() {
        return this.bdService.getCollection(DB_ENV.dbGameCollection);
    }

    async getGames(): Promise<Game[]> {
        try {
            const projection = { projection: { _id: 0 } };
            const games: Game[] = await this.collection.find<Game>({}, projection).toArray();
            return this.sortGamesList<Game>(games);
        } catch (error) {
            throw new Error('Echec recuperation des jeux');
        }
    }

    async getGameById(gid: string): Promise<Game> {
        return this.collection.findOne<Game>({ gid }, { projection: { _id: 0, imageBase64: 0 } });
    }

    async deleteGame(gid: string): Promise<DeleteResult> {
        return this.collection.deleteOne({ gid });
    }

    async toggleGameVisibility(gid: string): Promise<UpdateResult> {
        try {
            const game: Game = await this.collection.findOne<Game>({ gid });
            const isVisible: boolean = game && !game.isVisible;
            return this.collection.updateOne({ gid }, { $set: { isVisible } });
        } catch (e) {
            throw new Error(`Echec mise a jour visibilite du jeu ${gid}: ${e}"`);
        }
    }

    async addGame(game: Game): Promise<ValidationResponse<Game>> {
        try {
            this.prepareInsert(game);
            const feedbacks: ValidationFeedback = await this.checkValidation(game, true);

            if (feedbacks.errors.length > 0) return { resource: null, feedbacks };

            const res: InsertOneResult = await this.collection.insertOne(game);
            if (!res.acknowledged) throw new Error("Échec de l'ajout du jeu dans la base de données");
            return { resource: game };
        } catch (e) {
            throw new Error(`Échec de l'ajout du jeu ${game.gid}: ${e}`);
        }
    }

    async updateGame(game: Game, gid: string): Promise<ValidationResponse<Game>> {
        try {
            this.trimInputGameData(game);
            const record: Game = await this.collection.findOne<Game>({ gid });
            if (!record) return this.addGame(game);
            const feedbacks: ValidationFeedback = await this.checkValidation(game, false, gid);
            if (feedbacks.errors.length > 0) return { resource: null, feedbacks };
            return this.updateGameInDatabase(game, gid);
        } catch (error) {
            throw new Error(`Echec modification du jeu ${gid}: ${error}`);
        }
    }

    private trimInputGameData(game: Game): Game {
        game.name = game.name.trim();
        game.description = game.description.trim();
        return game;
    }

    private initDate(game: Game): Game {
        game.creationDate = new Date();
        game.lastEditDate = new Date();
        return game;
    }

    private prepareInsert(game: Game): Game {
        game.gid = this.generateGID();
        this.initDate(game);
        this.trimInputGameData(game);
        game.isVisible = false;
        return game;
    }

    private generateGID(): string {
        const timestamp: string = new Date().getTime().toString(BASE36);
        const randomPart: string = Math.random().toString(BASE36).substring(2, MAX_GAME_ID_LENGTH);
        const counterPart: string = (this.counter++).toString(BASE36);
        return `${timestamp}${randomPart}${counterPart}_`;
    }

    private sortGamesList<T extends { creationDate: Date }>(gamesList: T[]): T[] {
        return gamesList.sort((a, b) => new Date(a.creationDate).getTime() - new Date(b.creationDate).getTime());
    }

    private async getUpdateParameter(game: Game, gid: string): Promise<ValidationParameter> {
        const oldGameRecord: Game = await this.collection.findOne<Game>({ gid });
        return { record: game, create: false, oldName: oldGameRecord?.name };
    }

    private async checkValidation(game: Game, isNewGame: boolean, gid?: string): Promise<ValidationFeedback> {
        if (isNewGame) {
            return this.validationService.validate({ record: game, create: isNewGame }, this.collection);
        }
        return this.validationService.validate(await this.getUpdateParameter(game, gid), this.collection);
    }

    private async updateGameInDatabase(game: Game, gid: string): Promise<ValidationResponse<Game>> {
        const updateQuery = {
            $set: {
                name: game.name,
                description: game.description,
                lastEditDate: new Date(),
                imageBase64: game.imageBase64,
                isVisible: false,
                gameMap: game.gameMap,
            },
        };
        const res = await this.collection.updateOne({ gid }, updateQuery);
        if (!res.acknowledged) {
            throw new Error('Échec de la mise à jour du jeu dans la base de données');
        }
        return { resource: game };
    }
}
