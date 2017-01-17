from __future__ import unicode_literals

REQUEST_HEADER_BLACKLIST = [
    # Passing CF headers on to via causes "Error 1000: DNS points to
    # prohibited IP" errors at CloudFlare, so we have to strip them out
    # here.
    'CF-Connecting-IP',
    'CF-Ray',
    'CF-Visitor',
    'CF-Ipcountry',

    # Generic HTTP auth headers
    'Authorization',
    'Cookie',

    # h CSRF token header
    'X-Csrf-Token',
]

RESPONSE_HEADER_BLACKLIST = [
    'Set-Cookie',
]


class RequestHeaderSanitiser(object):

    """
    RequestHeaderSanitiser is a WSGI middleware which removes incoming HTTP
    headers according to a predefined blacklist.
    """

    def __init__(self, application, blacklist=None):
        self.application = application
        if blacklist is None:
            blacklist = REQUEST_HEADER_BLACKLIST
        self._blacklist = set(['HTTP_' + x.upper().replace('-', '_')
                               for x in blacklist])

    def __call__(self, environ, start_response):
        environ = {k: v
                   for k, v in environ.iteritems()
                   if k not in self._blacklist}
        return self.application(environ, start_response)


class ResponseHeaderSanitiser(object):

    """
    ResponseHeaderSanitiser is a WSGI middleware which removes outgoing HTTP
    headers according to a predefined blacklist.
    """

    def __init__(self, application, blacklist=None):
        self.application = application
        if blacklist is None:
            blacklist = RESPONSE_HEADER_BLACKLIST
        self._blacklist = set([x.lower() for x in blacklist])

    def __call__(self, environ, start_response):
        def new_start_response(status, response_headers, exc_info=None):
            response_headers = [(k, v)
                                for k, v in response_headers
                                if k.lower() not in self._blacklist]
            return start_response(status, response_headers, exc_info)
        return self.application(environ, new_start_response)
