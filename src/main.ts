import { isDevMode } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { makeServer } from './mirage/server';

if (isDevMode()) {
  console.log('Mirage démarre');
  makeServer();
}

bootstrapApplication(App, appConfig).catch((err) => console.error(err));
