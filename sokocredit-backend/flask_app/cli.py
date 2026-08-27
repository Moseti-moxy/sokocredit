import click
from flask import current_app
from flask.cli import with_appcontext


@click.command('send-overdue-reminders')
@with_appcontext
def send_overdue_reminders():
    """Send overdue payment reminders once using the scheduler service."""
    try:
        from tasks.scheduler_service import find_overdue_and_notify
    except Exception as e:
        click.echo(f'Failed to import scheduler: {e}')
        return
    find_overdue_and_notify(current_app._get_current_object())
