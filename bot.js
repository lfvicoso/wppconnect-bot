const wppconnect = require('@wppconnect-team/wppconnect');
const axios = require('axios');
const sql = require('mssql');
const http = require('http');

// Função assíncrona que posta contra API do ChatGPT, fazendo autenticação via token e retorna a resposta já extraída do json
async function getChatGptResponse(message) {
    const response = await axios.post('https://api.openai.com/v1/engines/text-davinci-003/completions', {
        prompt: `Me diga em no máximo 40 palavras o seguinte: ${message}`,
        max_tokens: 3000
    }, {
        headers: {
            'Authorization': `Bearer key`
        }
    });

    if (response.data && response.data.choices && response.data.choices.length > 0) {
        return response.data.choices[0].text.trim();
    } else {
        throw new Error('Não foi possível obter uma resposta do ChatGPT');
    }
}

//Função assíncrona que conecta ao SQL Server, e retorna resultado de uma procedure, limitando aos 5 primeiros
async function getCustomerNames() {
    //Dados de conexão com BD
    const config = {
        user: '',
        password: '',
        server: 'mssql.xref.com.br',
        options: {
            trustServerCertificate: true
        }
        //database: 'database'
    };

    //Executa a conexão e roda a consulta, caso erro, mostra o erro
    try {
        let pool = await sql.connect(config);
        let result = await pool.request().execute('SpSeCliente');
        let limitedResults = result.recordset.slice(0, 5); // Limita os resultados em 5
        console.log(limitedResults);
        return limitedResults
    } catch (err) {
        console.log(err);
    }
}

//Conecta o número de whatsapp a API e inicia o bot
wppconnect.create({
session: 'sessionName',
catchQR: (base64Qrimg, asciiQR, attempts, urlCode) => {
    console.log('Numero:', urlCode);
    console.log('Tentativas:', attempts);
    // var server = http.createServer(function (req, res) {
    //     res.writeHead(200, {'Content-Type': 'text/plain'});
    //     res.end('Hello World\nQrcode: '+urlCode);
    // });
    
    // server.listen(3000, function() {
    //     console.log('Server is listening on port ' + server.address().port);
    // });
},
}).then((client) => start(client));

//Main
function start(client) {
    //Enviar mensagem apos 10 segundos, substituir número sem o 9
    // setTimeout(() => {
    //     client.sendText('5531xxxxxxxxx@c.us', 'Ok, aguarde...')
    //         .then((result) => {
    //             console.log('Mensagem enviada com sucesso:', result);
    //         })
    //         .catch((erro) => {
    //             console.error('Erro ao enviar mensagem: ', erro);
    //         });
    // }, 10000);

    //Hora que acontece o evento e ele interpreta que uma mensagem foi enviada, seja para o grupo ou para particular do grupo
    client.onMessage(async (message) => {
        //message.isGroupMsg = retorna se a mensagem veio de um grupo
        
        //Condições usadas apenas para teste e demonstração

        //Deslogar o número que foi vínculado ao bot
        if (message.body === 'deslogar' && message.isGroupMsg === true) {
            client.logout().then((result) => {
                console.log('Deslogado com sucesso:', result);
            }).catch((erro) => {
                console.error('Erro ao deslogar:', erro);
            });
        }

        //Condições para ilustrar mensagens pré definidas, que estarão em um banco de dados
        if (message.body === 'Oi, tudo bem?' && message.isGroupMsg === true) {
            client.sendText(message.from, 'Olá, como posso ajudar?');
        }
        if (message.body === 'Emitir minha fatura' && message.isGroupMsg === true) {
            client.sendText(message.from, 'Ok, um momento que vou enviar sua fatura...');
        }
        if (message.body === 'Não consegui visualizar minha fatura' && message.isGroupMsg === true) {
            client.sendText(message.from, 'Ok, vou enviar a 2 via...');
        }

        //Condição para testar a integração com API do Openai
        //if ((message.body === 'Como calcular raiz quadrada de um número?' || message.body === 'O que é Inteligência Artifical?') && message.isGroupMsg === true) {
        if(message.body.indexOf('?') > -1){
            try {
                // Obtenha a resposta do ChatGPT
                const response = await getChatGptResponse(message.body);
    
                // Envia a resposta do ChatGPT para o grupo
                client.sendText(message.from, response);
                //message.reply(response);
            } catch (error) {
                client.sendText(message.from, 'Erro ao processar a mensagem: '+error);
                console.error('Erro ao processar a mensagem:', error);
            }
        }

        //Condição para testar conexão com SQL Server e para trazer o resultado esperado pela procedure
        if (message.body === 'Me liste 5 nomes do banco SQL Server' && message.isGroupMsg === true) {
            try {
                // Obtenha a resposta da procedure do SQL Server
                const response = await getCustomerNames();
    
                // Envia a resposta do banco para o grupo
                client.sendText(message.from, String(response));
            } catch (error) {
                client.sendText(message.from, 'Erro executar a consulta: '+error);
                console.error('Erro executar a consulta:', error);
            }
        }
    });
}