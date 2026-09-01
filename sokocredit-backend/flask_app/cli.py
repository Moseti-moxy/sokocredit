import click
from flask.cli import with_appcontext


@click.command('send-overdue-reminders')
@with_appcontext
def send_overdue_reminders():
    """Scan for newly-overdue loans, raise their risk alerts, and notify (in-app
    + SMS) each affected customer - see app.risk.scan_for_risk_alerts(). Nothing
    in this deployment calls this automatically yet (Render's free web-service
    tier has no built-in scheduler); run it on a schedule via an external
    pinger (e.g. a Render Cron Job, or a free service like cron-job.org hitting
    an admin-authenticated endpoint) until a real scheduler is added.
    """
    from app.extensions import db
    from app.risk import scan_for_risk_alerts

    created = scan_for_risk_alerts()
    db.session.commit()
    click.echo(f'Raised {len(created)} new risk alert(s) and notified affected customers.')
