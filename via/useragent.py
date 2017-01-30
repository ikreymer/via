from __future__ import unicode_literals


class UserAgentDecorator(object):

    """
    UserAgentDecorator is a WSGI middleware which appends tokens to the
    User-Agent header of the request.

    This token allows the origin web server to identify requests from Via and
    whitelist them.

    This relies on Via using the user agent from incoming requests when making
    requests to the destination site.
    """

    def __init__(self, application, token):
        """
        Create middleware which appends `token` to the `User-Agent` header
        of requests.
        """

        self.application = application
        self.token = token

    def __call__(self, environ, start_response):
        new_env = environ.copy()

        if new_env.get('HTTP_USER_AGENT'):
            new_env['HTTP_USER_AGENT'] = '{} {}'.format(new_env['HTTP_USER_AGENT'],
                                                        self.token)
        else:
            new_env['HTTP_USER_AGENT'] = self.token

        return self.application(new_env, start_response)
