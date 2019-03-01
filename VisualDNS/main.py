import os
from flask import request, send_file
from flask_api import FlaskAPI
from query import query

app = FlaskAPI(__name__)


@app.route('/api/query')
def api_query():
	qname = request.args.get('qname')
	dns_server = request.args.get('dns_server')
	qtype = request.args.get('qtype')
	return query(qname, dns_server, qtype)


@app.route('/<path:path>')
def index(path):
	path = 'static/{}'.format(path)
	return send_file(path) if os.path.exists(path) else ('', 404)


@app.route('/')
def _():
	return send_file('static/main.html')


if __name__ == '__main__':
	app.run(host='0.0.0.0')
