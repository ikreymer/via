from __future__ import unicode_literals

from werkzeug import wsgi
from werkzeug.wrappers import BaseResponse as Response


class Blocker(object):

    """
    Blocker is a WSGI middleware that returns a static response when a
    request path matches a list of predefined prefixes.
    """

    def __init__(self, application, prefixes=None, template=None):
        self.application = application
        if prefixes is None:
            prefixes = _read_prefixes()
        self._prefixes = tuple(prefixes)
        if template is None:
            template = _read_template()
        self._template = template

    def __call__(self, environ, start_response):
        if wsgi.get_path_info(environ).startswith(self._prefixes):
            resp = Response(self._template, status=451, mimetype='text/html')
            return resp(environ, start_response)
        return self.application(environ, start_response)


def _read_prefixes():
    with open('blocked/prefixes') as fp:
        lines = [l.strip() for l in fp.readlines()]
    return [l for l in lines if l]


def _read_template():
    with open('blocked/template.html') as fp:
        return fp.read()
