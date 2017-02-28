const fs       = require('fs');
const _        = require('lodash');
const Ajv      = require('ajv');
const runbooks = require('js-yaml')
	.safeLoad(fs.readFileSync('./runbooks.yaml', 'utf8'));

const ajv = new Ajv();

const PORT = 1337;

const endpoints = Object.keys(runbooks);

const http = require('http');


// CREATE COMPILED JSON SCHEMAS STORE
const validators = endpoints.reduce((mem, runbookName) => {
	mem[runbookName] = ajv.compile(runbooks[runbookName].schema);
	return mem;
}, {});

const defaultHeaders = {
	'Access-Control-Allow-Origin' : '*' // @TODO pare this down...
}

function writeHead(res, statusCode, headers) {
	return res.writeHead(statusCode, Object.assign(defaultHeaders, headers));
}


function getRunbooks(req, res) {
	const body = _.mapValues(
		runbooks,
		b => _.pick(b, ['name', 'description', 'schema'])
	);
	writeHead(res, 200, {'Content-Type': 'application/json'});
	return res.end(JSON.stringify(body, null, 4));
}

function executeRunbooks(req, res) {
	const body = [];

	req.on('data', chunk => body.push(chunk.toString('utf8')));

	req.on('end', () => {
		try {
			const reqBody = JSON.parse(body.join(''));
			if (validators[endpoint](reqBody)) { // if it validates the json schema
				return res.end('Executing runbook');
			}
			writeHead(res, 400);
			return res.end('invalid payload');
		} catch (e) {
			writeHead(res, 400);
			return res.end('could not parse request body');
		}
	});

}

// START SERVER
const server = http.createServer((req, res) => {
	const endpoint = req.url.substring(1);

	console.log('req.method', req.method);
	
	if (!(req.method === 'POST')) {
		return getRunbooks(req, res);
	} 

	if (endpoints.find((el) => el === endpoint)) {
		return executeRunbook(req, res);
	} else {
		writeHead(res, 404);
		res.end('endpoint not found');
	}
});

server.on('clientError', (err, socket) => {
	socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
});

server.listen(PORT);

console.log(`listening on port: ${PORT}`)

