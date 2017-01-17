FROM python:2.7-alpine
MAINTAINER Hypothes.is Project and Ilya Kreymer

# Install runtime deps.
RUN apk add --update \
    libffi \
    openssl \
  && rm -rf /var/cache/apk/*

# Create the via user, group, home directory and package directory.
RUN addgroup -S via && adduser -S -G via -h /var/lib/via via
WORKDIR /var/lib/via

ADD requirements.txt .

# Install build deps, build, and then clean up.
RUN apk add --update --virtual build-deps \
    build-base \
    git \
    libffi-dev \
    linux-headers \
    openssl-dev \
  && pip install --no-cache-dir -r requirements.txt \
  && apk del build-deps \
  && rm -rf /var/cache/apk/*

# Install app.
COPY . .

EXPOSE 9080

USER via
CMD ./run-uwsgi.sh
