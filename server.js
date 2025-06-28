const http = require('http');
const fs = require('fs');
const path = require('path');
const querystring = require('querystring');

const PORT = 3000; // サーバーがリッスンするポート番号
const POSTS_DIR = path.join(__dirname, 'posts'); // 投稿を保存するディレクトリ

// 投稿ディレクトリが存在しない場合は作成
if (!fs.existsSync(POSTS_DIR)) {
    fs.mkdirSync(POSTS_DIR);
    console.log(`'${POSTS_DIR}' ディレクトリを作成しました。`);
}

const server = http.createServer((req, res) => {
    // GETリクエストの処理
    if (req.method === 'GET') {
        if (req.url === '/') {
            // トップページ (index.html) の提供
            fs.readFile(path.join(__dirname, 'index.html'), (err, data) => {
                if (err) {
                    console.error('index.htmlの読み込みエラー:', err);
                    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
                    res.end('サーバーエラー: index.htmlが読み込めません');
                    return;
                }
                res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end(data);
            });
        } else if (req.url === '/posts') {
            // 投稿一覧の取得API
            fs.readdir(POSTS_DIR, (err, files) => {
                if (err) {
                    console.error('投稿ディレクトリの読み取りエラー:', err);
                    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
                    res.end('サーバーエラー: 投稿が読み込めません');
                    return;
                }

                let allPosts = [];
                let filesProcessed = 0;

                // 投稿ファイルがない場合は空の配列を返す
                if (files.length === 0) {
                    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify([]));
                    return;
                }

                // 各投稿ファイルを読み込み、JSONとしてパース
                files.forEach(file => {
                    // .json 拡張子を持つファイルのみを対象とする
                    if (path.extname(file) === '.json') {
                        fs.readFile(path.join(POSTS_DIR, file), 'utf8', (err, content) => {
                            if (err) {
                                console.error(`ファイル '${file}' の読み込みエラー:`, err);
                            } else {
                                try {
                                    const post = JSON.parse(content);
                                    allPosts.push(post);
                                } catch (parseErr) {
                                    console.error(`ファイル '${file}' のJSONパースエラー:`, parseErr);
                                }
                            }
                            filesProcessed++;
                            // すべてのファイルの処理が完了したら応答を送信
                            if (filesProcessed === files.length) {
                                // 日付の新しい順にソート (新しい投稿が上に来るように)
                                allPosts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                                res.end(JSON.stringify(allPosts));
                            }
                        });
                    } else {
                        filesProcessed++; // JSON以外のファイルも処理済みとしてカウント
                        if (filesProcessed === files.length) {
                            allPosts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                            res.end(JSON.stringify(allPosts));
                        }
                    }
                });
            });
        } else {
            // その他のGETリクエストは404 Not Found
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('Not Found');
        }
    }
    // POSTリクエストの処理
    else if (req.method === 'POST') {
        if (req.url === '/submit') {
            let body = '';
            // リクエストボディのデータを受信
            req.on('data', chunk => {
                body += chunk.toString();
            });
            // データ受信完了後の処理
            req.on('end', () => {
                const postData = querystring.parse(body); // フォームデータをパース
                const { username, message } = postData;

                // 必須フィールドのバリデーション
                if (!username || !message) {
                    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
                    res.end('ユーザー名とメッセージは必須です。');
                    return;
                }

                const timestamp = new Date().toISOString(); // ISO形式のタイムスタンプ
                const post = {
                    id: Date.now().toString(), // ユニークなID (タイムスタンプを文字列化したもの)
                    username: username,
                    message: message,
                    timestamp: timestamp
                };

                const filename = path.join(POSTS_DIR, `${post.id}.json`); // 保存するファイル名
                fs.writeFile(filename, JSON.stringify(post, null, 2), err => {
                    if (err) {
                        console.error('投稿の保存エラー:', err);
                        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
                        res.end('投稿の保存に失敗しました。');
                        return;
                    }
                    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
                    res.end('投稿が完了しました！');
                });
            });
        } else {
            // その他のPOSTリクエストは404 Not Found
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('Not Found');
        }
    }
    // その他のHTTPメソッドは許可しない
    else {
        res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Method Not Allowed');
    }
});

// サーバーを指定されたポートでリッスン開始
server.listen(PORT, () => {
    console.log(`サーバーがポート ${PORT} で起動しました: http://localhost:${PORT}`);
});
