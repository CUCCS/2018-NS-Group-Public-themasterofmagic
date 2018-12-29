import random
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
