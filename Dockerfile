FROM python:2.7
MAINTAINER Hypothes.is Project and Ilya Kreymer

# Create the via user, group, home directory and package directory.
RUN groupadd via \
  && useradd -d /var/lib/via -m -s /bin/bash -g via via
WORKDIR /var/lib/via

ADD requirements.txt .
RUN pip install -r requirements.txt
COPY . .

EXPOSE 9080

USER via
CMD ./run-uwsgi.sh
