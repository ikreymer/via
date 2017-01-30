import pytest

from werkzeug.test import Client
from werkzeug.wrappers import BaseResponse as Response
from werkzeug import wsgi

from via.useragent import UserAgentDecorator


class TestUserAgentDecorator(object):
    def test_it_appends_token_to_request_user_agent(self, client):
        headers = [('User-Agent', 'OriginalUserAgent/42')]
        resp = client.get('/example.com', headers=headers)
        assert resp.data == 'Fetched URL as "OriginalUserAgent/42 Hypothesis-Via"'

    def test_it_sets_user_agent_if_not_present(self, client):
        resp = client.get('/example.com')
        assert resp.data == 'Fetched URL as "Hypothesis-Via"'

    @pytest.fixture
    def app(self):
        return UserAgentDecorator(upstream_app, 'Hypothesis-Via')

    @pytest.fixture
    def client(self, app):
        return Client(app, Response)


@wsgi.responder
def upstream_app(environ, start_response):
    user_agent = environ.get('HTTP_USER_AGENT', None)
    return Response('Fetched URL as "{}"'.format(user_agent), mimetype='text/plain')
