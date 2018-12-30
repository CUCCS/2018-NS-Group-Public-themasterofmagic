FROM python:3

WORKDIR ./VisualDNS/
COPY requirements.txt ./ 

RUN pip install -i https://pypi.tuna.tsinghua.edu.cn/simple -r requirements.txt

COPY . .

CMD ["python", "./main.py"]

