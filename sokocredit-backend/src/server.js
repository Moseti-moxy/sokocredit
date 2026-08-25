import { createApp } from './app.js';

const port = Number(process.env.PORT ?? 5000);
createApp().listen(port, () => console.log(`SokoCredit loan API listening on http://localhost:${port}`));
