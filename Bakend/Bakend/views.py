from django.http import HttpResponse


def home(request):
    html = """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>BoostMe API</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                background: linear-gradient(135deg, #0f172a, #1d4ed8);
                color: #f8fafc;
                margin: 0;
                padding: 0;
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .card {
                background: rgba(255,255,255,0.12);
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255,255,255,0.2);
                border-radius: 20px;
                padding: 32px;
                width: min(760px, 92%);
                box-shadow: 0 20px 50px rgba(0,0,0,0.2);
            }
            .badge {
                display: inline-block;
                background: #22c55e;
                color: white;
                padding: 6px 12px;
                border-radius: 999px;
                font-size: 12px;
                font-weight: bold;
                letter-spacing: 0.5px;
                text-transform: uppercase;
                margin-bottom: 12px;
            }
            h1 {
                margin: 0 0 8px;
                font-size: 2rem;
            }
            p {
                line-height: 1.6;
                color: #e2e8f0;
            }
            .grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
                gap: 12px;
                margin-top: 20px;
            }
            .item {
                background: rgba(255,255,255,0.14);
                border-radius: 12px;
                padding: 12px;
            }
            .item a {
                color: #fff;
                text-decoration: none;
                font-weight: bold;
            }
            .item small {
                display: block;
                color: #cbd5e1;
                margin-top: 4px;
            }
        </style>
    </head>
    <body>
        <div class="card">
            <div class="badge">Online</div>
            <h1>BoostMe API</h1>
            <p>The backend is running and ready to serve requests.</p>
            <p style="margin-top: 20px;"><a href="/admin/" style="display: inline-block; background: #2563eb; color: white; padding: 12px 20px; border-radius: 999px; text-decoration: none; font-weight: bold;">Go to admin login</a></p>
            <div class="grid">
                <div class="item"><a href="/admin/">Admin panel</a><small>Manage the platform</small></div>
                <div class="item"><a href="/api/plans/plans/">Plans</a><small>View available plans</small></div>
                <div class="item"><a href="/api/bonuses/bonus-types/">Bonuses</a><small>See bonus types</small></div>
                <div class="item"><a href="/api/users/">Users</a><small>Manage user endpoints</small></div>
                <div class="item"><a href="/api/tasks/">Tasks</a><small>Task endpoints</small></div>
                <div class="item"><a href="/api/referrals/">Referrals</a><small>Referral endpoints</small></div>
            </div>
        </div>
    </body>
    </html>
    """
    return HttpResponse(html, content_type='text/html; charset=utf-8')


def custom_not_found(request, exception=None):
    html = """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>404 · BoostMe API</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                background: linear-gradient(135deg, #111827, #374151);
                color: #f9fafb;
                margin: 0;
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .card {
                background: rgba(255,255,255,0.1);
                padding: 32px;
                border-radius: 16px;
                width: min(560px, 92%);
                text-align: center;
            }
            h1 { font-size: 2rem; margin-bottom: 8px; }
            a { color: #93c5fd; text-decoration: none; }
        </style>
    </head>
    <body>
        <div class="card">
            <h1>404 · Endpoint not found</h1>
            <p>The route you requested does not exist.</p>
            <p><a href="/">Go back to the BoostMe API home</a></p>
        </div>
    </body>
    </html>
    """
    return HttpResponse(html, content_type='text/html; charset=utf-8', status=404)
