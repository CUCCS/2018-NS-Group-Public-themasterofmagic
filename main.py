import os
from flask import request, send_file
from flask_api import FlaskAPI
from query import query
from geo import add_geo_info

app = FlaskAPI(__name__)


@app.route('/api/query')
def api_query():
	# qname = request.args.get('domain', '')
	# ns = request.args.get('ns', '')
	# query_rv = query(qname, ns)
	# add_geo_info(query_rv)
	# print(query_rv)
	from random import choice
	query_rv = choice([
		{'status': 'A', 'answer': '202.205.24.196',
		 'path': ['j.root-servers.net.', 'g.dns.cn.', 'dns2.edu.cn.', 'bdns.cuc.edu.cn.'],
		 'domain_to_ip': {'j.root-servers.net.': '192.58.128.30', 'g.dns.cn.': '66.198.183.65',
											'dns2.edu.cn.': '202.112.0.13', 'bdns.cuc.edu.cn.': '202.205.16.3'},
		 'ip_to_geo': {'192.58.128.30': (-37.751, -97.822), '66.198.183.65': (-40.7111, -73.9469),
									 '202.112.0.13': (-34.7725, 113.7266), '202.205.16.3': (-39.9289, 116.3883)}}
		,
		{'status': 'A', 'answer': '202.205.24.196',
		 'path': ['j.root-servers.net.', 'b.dns.cn.', 'ns2.cuhk.hk.', 'bdns2.cuc.edu.cn.'],
		 'domain_to_ip': {'j.root-servers.net.': '192.58.128.30', 'b.dns.cn.': '203.119.26.1',
											'ns2.cuhk.hk.': '137.189.6.21', 'bdns2.cuc.edu.cn.': '60.247.40.3'},
		 'ip_to_geo': {'192.58.128.30': (-37.751, -97.822), '203.119.26.1': (-34.7725, 113.7266),
									 '137.189.6.21': (-22.25, 114.1667), '60.247.40.3': (-39.9288, 116.3889)}}
		,
		{'status': 'A', 'answer': '202.205.24.196',
		 'path': ['b.root-servers.net.', 'g.dns.cn.', 'ns2.cuhk.hk.', 'bdns2.cuc.edu.cn.'],
		 'domain_to_ip': {'b.root-servers.net.': '199.9.14.201', 'g.dns.cn.': '66.198.183.65',
											'ns2.cuhk.hk.': '137.189.6.21', 'bdns2.cuc.edu.cn.': '60.247.40.3'},
		 'ip_to_geo': {'199.9.14.201': (-37.751, -97.822), '66.198.183.65': (-40.7111, -73.9469),
									 '137.189.6.21': (-22.25, 114.1667), '60.247.40.3': (-39.9288, 116.3889)}}
	])
	return query_rv


@app.route('/<path:path>')
def index(path):
	path = 'static/{}'.format(path)
	return send_file(path) if os.path.exists(path) else ''


@app.route('/')
def _():
	return send_file('static/index.html')


if __name__ == '__main__':
	app.run()
