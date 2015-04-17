from pywb.webapp.live_rewrite_handler import RewriteHandler
from pywb.framework.wbrequestresponse import WbResponse

from pywb.framework.basehandlers import BaseHandler


class SimpleRedirHandler(BaseHandler):
    def __call__(self, wbrequest):
        if wbrequest.wb_url_str == '/':
            wbrequest.wb_url_str = ''
        return WbResponse.redir_response(self.redir_path + wbrequest.wb_url_str,
                                         self.status)


class CustomRedirHandler(RewriteHandler):
    def __init__(self, config):
        super(CustomRedirHandler, self).__init__(config)

        self.redirects = config.get('redirects', {})

    def _make_response(self, wbrequest, status_headers, gen, is_rewritten):
        # only redirect for non-identity and non-embeds
        if not wbrequest.wb_url.is_embed and not wbrequest.wb_url.is_identity:
            content_type = status_headers.get_header('Content-Type')

            redir = self.redirects.get(content_type)

            if redir:
                return WbResponse.redir_response(redir.format(wbrequest.wb_url.url))

        return super(CustomRedirHandler, self)._make_response(wbrequest,
                                                              status_headers,
                                                              gen,
                                                              is_rewritten)
