FROM python:2.7
MAINTAINER Hypothes.is Project and Ilya Kreymer

WORKDIR /via/

ADD requirements.txt /via/

RUN pip install -r requirements.txt

ADD . /via/
COPY ./templates ./templates
COPY ./static ./static

EXPOSE 9080

CMD ./run-uwsgi.sh
