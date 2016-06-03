import jinja2

from pywb.webapp.live_rewrite_handler import RewriteHandler
from pywb.framework.wbrequestresponse import WbResponse


env = jinja2.Environment(loader=jinja2.FileSystemLoader('templates/',
                                                        encoding='utf-8-sig'))


class TemplateRewriteHandler(RewriteHandler):
    def __init__(self, config):
        super(TemplateRewriteHandler, self).__init__(config)

        self.templates = config.get('templates', {})

    def _make_response(self, wbrequest, status_headers, gen, is_rewritten):
        # only redirect for non-identity and non-embeds
        if not wbrequest.wb_url.is_embed and not wbrequest.wb_url.is_identity:
            content_type = status_headers.get_header('Content-Type')
            tpl_name = self.templates.get(content_type)

            if tpl_name is not None:
                tpl = env.get_template(tpl_name)
                result = tpl.render(url=wbrequest.wb_url.url)
                return WbResponse.text_response(result,
                                                content_type='text/html')

        return super(TemplateRewriteHandler, self)._make_response(
            wbrequest,
            status_headers,
            gen,
            is_rewritten)
