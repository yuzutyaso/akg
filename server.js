const http = require('http');
const fs = require('fs');
const path = require('path');
const querystring = require('querystring');

const PORT = 3000;
const POSTS_DIR = path.join(__dirname, 'posts'); // 投稿を保存するディレクトリ

// 投稿ディレクトリが存在しない場合は作成
if (!fs.existsSync(POSTS_DIR)) {
    fs.mkdirSync(POSTS_DIR);
}

const server = http.createServer((req, res) => {
    if (req.method === 'GET') {
        if (req.url === '/') {
            // トップページ（掲示板表示）
            fs.readFile(path.join(__dirname, 'index.html'), (err, data) => {
                if (err) {
                    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
                    res.end('サーバーエラー: index.htmlが読み込めません');
                    return;
                }
                res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end(data);
            });
        } else if (req.url === '/posts') {
            // 投稿一覧の取得
            fs.readdir(POSTS_DIR, (err, files) => {
                if (err) {
                    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
                    res.end('サーバーエラー: 投稿が読み込めません');
                    return;
                }

                let allPosts = [];
                let filesProcessed = 0;

                if (files.length === 0) {
                    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify([]));
                    return;
                }

                files.forEach(file => {
                    fs.readFile(path.join(POSTS_DIR, file), 'utf8', (err, content) => {
                        if (err) {
                            console.error(`Error reading file ${file}:`, err);
                            // エラーがあっても処理を続行
                        } else {
                            try {
                                const post = JSON.parse(content);
                                allPosts.push(post);
                            } catch (parseErr) {
                                console.error(`Error parsing JSON from file ${file}:`, parseErr);
                            }
                        }
                        filesProcessed++;
                        if (filesProcessed === files.length) {
                            // 日付の新しい順にソート
                            allPosts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                            res.end(JSON.stringify(allPosts));
                        }
                    });
                });
            });
        } else {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('Not Found');
        }
    } else if (req.method === 'POST') {
        if (req
