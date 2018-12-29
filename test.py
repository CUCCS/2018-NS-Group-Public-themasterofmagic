import unittest
from query import query


class TestQuery(unittest.TestCase):
  def test_a(self):
    rv = query('www.qq.com')
    self.assertEqual(rv['status'], 'A')

  def test_cname(self):
    rv = query('www.163.com')
    self.assertEqual(rv['status'], 'CNAME')

  def test_no_such_domain(self):
    rv = query('www')
    self.assertEqual(rv['status'], 'FAIL')
    self.assertEqual(rv['value'], 'NO_SUCH_DOMAIN')

  def test_timeout(self):
    rv = query('cn.bing.com', '0.1.2.3', 0.5)  # invalid ns leads to timeout exception
    self.assertEqual(rv['status'], 'FAIL')
    self.assertEqual(rv['value'], 'TIMEOUT')
