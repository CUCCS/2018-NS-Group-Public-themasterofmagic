import ipaddress
import dns.resolver
from geo import ip_with_geo_info


def query(qname, dns_server=None, qtype=None, timeout=1):
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
		answers = response.answer if response.answer else response.authority
		answers = list(answers)  # 1个由各种RRSet组成的list

		# answers由若干CNAME RRSet以及A RRSet组成
		# 若非空, 则将第一个RRSet的信息取出
		rdtype = {1: 'A', 2: 'NS', 5: 'CNAME'}[answers[0].rdtype] if len(answers) else 'NS'
		answers = list(_.to_text() for _ in answers[0]) if len(answers) else list()

		# 当查询类型为NS时, 将各ns的ip地址带上地理信息一并加入到answers中
		if rdtype == 'NS':
			answers = list([ns, list(ip_with_geo_info(_.to_text()) for _ in dns.resolver.query(ns))] for ns in answers)
		# 当查询类型为A时, 也将各ip地址的地理信息加上
		elif rdtype == 'A':
			answers = list(map(ip_with_geo_info, answers))

		rv = dict(
			type=rdtype,
			answers=answers
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
