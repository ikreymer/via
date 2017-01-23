#!/bin/sh

mypath=$(cd `dirname $0` && pwd)

if [ -n "$VIRTUAL_ENV" ] ; then
    params="$params -H $VIRTUAL_ENV"
fi

uwsgi $mypath/uwsgi.ini \
    --gevent 1000 \
    --gevent-monkey-patch \
    -p ${WEB_CONCURRENCY:-10} \
    -L \
    $params
