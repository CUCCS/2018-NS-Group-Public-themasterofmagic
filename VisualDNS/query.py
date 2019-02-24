import random
import ipaddress
import dns.resolver


def answers_to_list(answers):
	"""将查询得到的原始数据转变只包含关心数据的list"""
	return list(rdata.to_text() for rdata in answers)


def additional_to_dict(additional: list):
	"""将additional部分转变为[domain] -> [ipv4]的dict"""
	return dict(
		(rrset.name.to_text(), list(a.address for a in rrset))
		for rrset in additional if rrset.rdtype == dns.rdatatype.A
	)


def query(qname, ns=None, timeout=3):
	rv = dict()
	try:
		path = list()  # 用于查询成功时返回查询路径
		domain_to_ip = dict()  # 用于记录域名对应的ip
		resolver = dns.resolver.Resolver()
		if ns:
			resolver.nameservers = [ns]

		# 先根据指定的NS获取根NS的信息并选择其中一个作为下一次查询的NS
		answers = resolver.query('.', 'NS', lifetime=timeout)
		ns_list = answers_to_list(answers)

		while True:
			ns = random.choice(ns_list)
			ns_ip = random.choice(dns.resolver.query(ns)).to_text()
			path.append(ns)
			domain_to_ip[ns] = ns_ip

			# 使用上一次查询给定的服务器作为这次查询的NS
			resolver.nameservers = [ns_ip]
			answers = resolver.query(qname, 'A', raise_on_no_answer=False)
			if answers:
				# 如果查询到了A记录
				rv = dict(
					status='A',
					answer=random.choice(answers_to_list(answers)),
					path=path,
					domain_to_ip=domain_to_ip
				)
				break
			elif answers.response.answer:
				# 查询到了CNAME记录
				rv = dict(
					status='CNAME',
					answer=answers.response.answer[0][0].to_text(),
					path=path,
					domain_to_ip=domain_to_ip
				)
				break
			else:
				# 既没有A记录也没有CNAME记录, 那就在authority里挑一个作为下一次查询的NS
				ns_list = answers_to_list(answers.response.authority[0])
	except dns.resolver.NXDOMAIN:
		# 不存在的域名
		rv = dict(
			status='FAIL',
			value='NO_SUCH_DOMAIN'
		)
	except dns.exception.Timeout:
		# 查询超时
		rv = dict(
			status='FAIL',
			value='TIMEOUT'
		)
	except Exception as e:
		# 未知错误
		rv = dict(
			status='FAIL',
			value='UNKNOWN_ERROR'
		)
		print(e)
	finally:
		return rv


def query_(qname, dns_server=None, qtype=None, timeout=1):
	try:
		resolver = dns.resolver.Resolver()
		if dns_server:
			try:
				ipaddress.ip_address(dns_server)  # 检验是否是ip地址, 若不是则报ValueError
			except ValueError:
				raise AssertionError('INVALID_DNS_SERVER')
			resolver.nameservers = [dns_server]
			pass
		qtype = qtype or 'A'
		if qtype not in ('A', 'NS'):
			raise ValueError()

		rdata = resolver.query(qname, qtype, lifetime=timeout, raise_on_no_answer=False)
		response = rdata.response
		answers, additions = response.answer, response.additional
		answers, additions = list(answers), list(additions)  # 3个由各种RRSet组成的list

		# answers由若干CNAME RRSet以及A RRSet组成
		# 若非空, 则将第一个RRSet的信息取出
		rdtype = {1: 'A', 2: 'NS', 5: 'CNAME'}[answers[0].rdtype] if len(answers) else 'NS'
		answers = list(_.to_text() for _ in answers[0]) if len(answers) else list()

		# authorities包含在了additions中
		# additions由若干A RRSet以及AAAA RRSet组成
		# 取出其中的A记录, 建立由dict(name -> addresses)组成的list
		authorities = list([rrset.name.to_text(), list(a.to_text() for a in rrset)] for rrset in additions if rrset.rdtype == 1)

		rv = dict(
			type=rdtype,
			answers=answers,
			authorities=authorities
		)
	except dns.resolver.NXDOMAIN:
		# 不存在的域名
		rv = dict(
			type='FAIL',
			info='NO_SUCH_DOMAIN'
		)
	except dns.exception.Timeout:
		# 查询超时
		rv = dict(
			type='FAIL',
			info='TIMEOUT'
		)
	except ValueError:
		# 不支持的查询类型
		rv = dict(
			type='FAIL',
			info='UNSUPPORTED_QTYPE'
		)
	except AssertionError as e:
		# 自定义错误
		rv = dict(
			type='FAIL',
			info=e.args[0]
		)
	except Exception as e:
		# 未知错误
		rv = dict(
			type='FAIL',
			info='UNKNOWN_ERROR'
		)
		print(e)
	return rv
