import pytest

from werkzeug.test import Client
from werkzeug.wrappers import BaseResponse as Response
from werkzeug import wsgi

from via.blocker import Blocker

block_examples = pytest.mark.parametrize('path,blocked', [
    ('/', False),
    ('/giraf', False),
    ('/giraffe', True),
    ('/giraffe/', True),
    ('/giraffe/neck', True),
    ('/birds', False),
    ('/birds/goose', False),
    ('/birds/duck', True),
    ('/birds/duck/bill', True),
])


class TestBlocker(object):
    @block_examples
    def test_serves_template(self, client, path, blocked):
        resp = client.get(path)
        if blocked:
            assert resp.data == 'your eyes are protected'
        else:
            assert resp.data == 'scary upstream content'

    @block_examples
    def test_sets_status(self, client, path, blocked):
        resp = client.get(path)
        if blocked:
            assert resp.status_code == 451
        else:
            assert resp.status_code == 200

    @block_examples
    def test_sets_mimetype(self, client, path, blocked):
        resp = client.get(path)
        if blocked:
            assert resp.headers['content-type'].startswith('text/html')
        else:
            assert resp.headers['content-type'].startswith('text/plain')

    @pytest.fixture
    def app(self):
        return Blocker(upstream_app,
                       prefixes=['/giraffe', '/birds/duck'],
                       template='your eyes are protected')

    @pytest.fixture
    def client(self, app):
        return Client(app, Response)


@wsgi.responder
def upstream_app(environ, start_response):
    return Response('scary upstream content', mimetype='text/plain')
