import { provideHttpClient } from '@angular/common/http';
import { enableProdMode } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { Routes, provideRouter, withHashLocation } from '@angular/router';
import { AdminPageComponent } from '@app/pages/admin-page/admin-page.component';
import { AppComponent } from '@app/pages/app/app.component';
import { CreatePartyPageComponent } from '@app/pages/create-party-page/create-party-page.component';
import { HomePageComponent } from '@app/pages/home-page/home-page.component';
import { environment } from './environments/environment';
import { WaitingPageComponent } from '@app/pages/waiting-page/waiting-page.component';
import { CreateCharacterComponent } from '@app/pages/create-character-page/create-character-page.component';
import { EditCreateGamePageComponent } from '@app/pages/edit-create-game-page/edit-create-game-page.component';
import { JoinPartyComponent } from '@app/pages/join-party/join-party.component';
import { UrlPath } from '@app/enums/url-path';
import { GamePageComponent } from '@app/pages/game-page/game-page.component';
import { EndGamePageComponent } from '@app/pages/end-game-page/end-game-page.component';

if (environment.production) {
    enableProdMode();
}

const routes: Routes = [
    { path: '', redirectTo: `/${UrlPath.Home}`, pathMatch: 'full' },
    { path: UrlPath.Home, component: HomePageComponent },
    { path: UrlPath.CreateCharacter, component: CreateCharacterComponent },
    { path: UrlPath.Admin, component: AdminPageComponent },
    { path: UrlPath.CreateParty, component: CreatePartyPageComponent },
    { path: UrlPath.Waiting, component: WaitingPageComponent },
    { path: `${UrlPath.EditGame}/:id`, component: EditCreateGamePageComponent },
    { path: UrlPath.JoinParty, component: JoinPartyComponent },
    { path: UrlPath.Game, component: GamePageComponent },
    { path: UrlPath.EndGame, component: EndGamePageComponent },
    { path: '**', redirectTo: `/${UrlPath.Home}` },
];

bootstrapApplication(AppComponent, {
    providers: [provideHttpClient(), provideRouter(routes, withHashLocation()), provideAnimations()],
});
