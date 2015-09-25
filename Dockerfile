FROM python:2.7
MAINTAINER Hypothes.is Project and Ilya Kreymer

WORKDIR /src/
ADD requirements.txt /src/
RUN pip install -r requirements.txt
COPY . /src/

EXPOSE 9080

CMD ./run-uwsgi.sh
