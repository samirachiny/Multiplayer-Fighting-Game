import { GameService } from '@app/services/game/game.service';
import { Service } from 'typedi';
import { Request, Response, Router } from 'express';
import { HttpStatusCode } from '@common/enums/http-status-code';
import { Game } from '@common/interfaces/game';
import { DeleteResult } from 'mongodb';
@Service()
export class GameController {
    router: Router;
    clients: Response[] = [];

    constructor(private readonly gameService: GameService) {
        this.configureRouter();
    }

    private configureRouter(): void {
        this.router = Router();

        this.router.get('/', async (req: Request, res: Response) => {
            try {
                const games: Game[] = await this.gameService.getGames();

                res.status(HttpStatusCode.Success).json(games);
            } catch (e) {
                res.status(HttpStatusCode.InternalServerError).json({
                    title: 'Erreur à la récupération',
                    body: `Impossible de récupérer les jeux: ${e}`,
                });
            }
        });

        this.router.get('/:id', async (req: Request, res: Response) => {
            try {
                const game: Game = await this.gameService.getGameById(req.params.id);
                if (!game) {
                    res.status(HttpStatusCode.NotFound).send();
                    return;
                }
                res.status(HttpStatusCode.Success).json(game);
            } catch (e) {
                res.status(HttpStatusCode.InternalServerError).json({
                    title: 'Erreur à la récupération',
                    body: `Impossible de récupérer le jeu: ${e}`,
                });
            }
        });

        this.router.post('/', async (req: Request, res: Response) => {
            try {
                if (!req.body || Object.keys(req.body).length === 0) {
                    res.status(HttpStatusCode.BadRequest).send({});
                    return;
                }
                const result = await this.gameService.addGame(req.body);

                if (!result) {
                    res.status(HttpStatusCode.InternalServerError).send({});
                    return;
                }

                if (!result.resource) {
                    res.status(HttpStatusCode.BadRequest).json(result);
                    return;
                }

                res.status(HttpStatusCode.Created).json(result);
            } catch (e) {
                res.status(HttpStatusCode.InternalServerError).json({ title: 'Erreur à la création', body: `Impossible de créer le jeu: ${e}` });
            }
        });

        this.router.patch('/:id', async (req: Request, res: Response) => {
            try {
                const result = await this.gameService.toggleGameVisibility(req.params.id);
                if (result.matchedCount === 0) {
                    res.status(HttpStatusCode.NotFound).send();
                    return;
                }

                res.status(HttpStatusCode.NotContent).send();
            } catch (e) {
                res.status(HttpStatusCode.InternalServerError).json({
                    title: 'Erreur à la modification',
                    body: `Impossible de modifier la visibilité: ${e}`,
                });
            }
        });

        this.router.put('/:id', async (req: Request, res: Response) => {
            try {
                const result = await this.gameService.updateGame(req.body, req.params.id);
                if (result.resource === null) {
                    res.status(HttpStatusCode.BadRequest).send(result);
                    return;
                }

                res.status(HttpStatusCode.Success).send(result);
            } catch (e) {
                res.status(HttpStatusCode.InternalServerError).json({
                    title: 'Erreur à la modification',
                    body: `Impossible de modifier le jeu: ${e}`,
                });
            }
        });

        this.router.delete('/:id', async (req: Request, res: Response) => {
            try {
                const result: DeleteResult = await this.gameService.deleteGame(req.params.id);
                if (result.deletedCount === 0) {
                    res.status(HttpStatusCode.NotFound).send();
                    return;
                }

                res.status(HttpStatusCode.NotContent).send();
            } catch (error) {
                res.status(HttpStatusCode.InternalServerError).json({
                    title: 'Erreur à la suppression',
                    body: `Impossible de supprimer le jeu: ${error}`,
                });
            }
        });
    }
}
