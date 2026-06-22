// 简单路由类
export class Router {
    constructor() {
        this.routes = [];
    }

    // 添加 GET 路由
    get(pattern, handler) {
        this.routes.push({ method: 'GET', pattern, handler });
        return this;
    }

    // 添加 POST 路由
    post(pattern, handler) {
        this.routes.push({ method: 'POST', pattern, handler });
        return this;
    }

    // 添加 PUT 路由
    put(pattern, handler) {
        this.routes.push({ method: 'PUT', pattern, handler });
        return this;
    }

    // 添加 PATCH 路由
    patch(pattern, handler) {
        this.routes.push({ method: 'PATCH', pattern, handler });
        return this;
    }

    // 添加 DELETE 路由
    delete(pattern, handler) {
        this.routes.push({ method: 'DELETE', pattern, handler });
        return this;
    }

    // 解析路由模式，返回参数和剩余路径
    match(method, pathname) {
        for (const route of this.routes) {
            if (route.method !== method) continue;

            const patternParts = route.pattern.split('/');
            const pathParts = pathname.split('/');

            if (patternParts.length !== pathParts.length) continue;

            const params = {};
            let match = true;

            for (let i = 0; i < patternParts.length; i++) {
                const patternPart = patternParts[i];
                const pathPart = pathParts[i];

                if (patternPart.startsWith(':')) {
                    // 命名参数
                    params[patternPart.slice(1)] = decodeURIComponent(pathPart);
                } else if (patternPart === '*') {
                    // 通配符
                    params['*'] = pathParts.slice(i).join('/');
                    break;
                } else if (patternPart !== pathPart) {
                    match = false;
                    break;
                }
            }

            if (match) {
                return { handler: route.handler, params };
            }
        }

        return null;
    }

    // 处理请求（支持异步）
    handle(method, pathname, body = null, query = null) {
        const result = this.match(method, pathname);
        if (!result) {
            return null;
        }

        // 处理查询参数
        const queryParams = {};
        if (query && typeof query.entries === 'function') {
            for (const [key, value] of query.entries()) {
                queryParams[key] = value;
            }
        }

        try {
            const output = result.handler(result.params, body || {}, queryParams);
            // 支持异步 handler
            if (output && typeof output.then === 'function') {
                return output.then(data => ({ status: 200, data }));
            }
            return { status: 200, data: output };
        } catch (error) {
            if (error.status) {
                return { status: error.status, data: { error: error.code, message: error.message } };
            }
            throw error;
        }
    }
}

export default Router;
