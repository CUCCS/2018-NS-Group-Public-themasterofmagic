# VisualDNS - DNS递归查询可视化

- 此项目~~勉强~~实现了将DNS递归查询的过程进行可视化的功能

# ~~当前~~效果展示
- <img src=images/sample.gif width=75%>

# 部署说明
- (推荐)从Docker部署  
	`docker run --rm --name VisualDNS -p 5000:5000 -d themasterofmagic/master:VisualDNS`
- 或者从源码部署  
	```bash
	git clone https://github.com/CUCCS/2018-NS-Group-Public-themasterofmagic.git
	cd 2018-NS-Group-Public-themasterofmagic
	git checkout VisualDNS
	cd VisualDNS
	pip install -r requirements.txt
	python main.py  # 这里的python指python3
	```
