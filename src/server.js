import express from 'express';

const app = express();
const port = 8888;

app.get("/", (_, res) => {
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Forgekeeper</title>
    </head>
    <body>Hello</body>
    </html>
    `);
});

app.listen(port, "0.0.0.0", () => {
    console.log(`Listening on http://0.0.0.0:${port}`);
});
