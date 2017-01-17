import pytest

from werkzeug.test import Client
from werkzeug.wrappers import BaseRequest as Request, BaseResponse as Response

from via.security import RequestHeaderSanitiser, ResponseHeaderSanitiser


class TestRequestHeaderSanitizer(object):
    def test_removes_blacklisted_request_headers(self, client):
        resp = client.get('/', headers={'foo': 'hidden', 'bar': 'hidden'})
        headers = [line.lower() for line in resp.data.splitlines()]
        assert 'foo' not in headers
        assert 'bar' not in headers

    def test_request_blacklist_case_insensitive(self, client):
        resp = client.get('/', headers={'FOO': 'hidden', 'Bar': 'hidden'})
        headers = [line.lower() for line in resp.data.splitlines()]
        assert 'foo' not in headers
        assert 'bar' not in headers

    def test_passes_unblacklisted_request_headers(self, client):
        resp = client.get('/', headers={'qux': 'pass me through, scotty!'})
        headers = [line.lower() for line in resp.data.splitlines()]
        assert 'qux' in headers

    @pytest.fixture
    def app(self):
        return RequestHeaderSanitiser(upstream_app, blacklist=['foo', 'bar'])

    @pytest.fixture
    def client(self, app):
        return Client(app, Response)


class TestResponseHeaderSanitizer(object):
    def test_removes_blacklisted_response_headers(self, client):
        resp = client.get('/')
        headers = [k.lower() for k, v in resp.headers]
        assert 'baz' not in headers

    def test_passes_unblacklisted_response_headers(self, client):
        resp = client.get('/')
        headers = [k.lower() for k, v in resp.headers]
        assert 'qux' in headers

    @pytest.fixture
    def app(self):
        return ResponseHeaderSanitiser(upstream_app, blacklist=['baz'])

    @pytest.fixture
    def client(self, app):
        return Client(app, Response)


def upstream_app(environ, start_response):
    request = Request(environ, populate_request=False)
    header_list = '\n'.join([k for k, v in request.headers])
    response = Response(header_list, mimetype='text/plain')
    response.headers.add('Baz', 'should be hidden')
    response.headers.add('Qux', 'should pass through')
    return response(environ, start_response)
