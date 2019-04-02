import os
from random import choice
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


with open('static/alexa_100k.txt', 'r') as f:
	qname_list = f.readlines()
	qname_list = list(map(str.strip, qname_list))


@app.route('/api/random_qname')
def apt_random_qname():
	return dict(qname=choice(qname_list))


@app.route('/<path:path>')
def index(path):
	return send_file(path) if os.path.exists(path) else ('', 404)


@app.route('/')
def _():
	return send_file('main.html')


if __name__ == '__main__':
	app.run(host='0.0.0.0')
