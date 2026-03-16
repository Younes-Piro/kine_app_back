from datetime import timedelta

from app_settings.models import ClinicClosedDay, ClinicClosureRange, Holiday


def get_sessions_per_week(rhythm_code):
    mapping = {
        "1_per_week": 1,
        "2_per_week": 2,
        "3_per_week": 3,
    }
    return mapping.get(rhythm_code)


def get_session_weekdays(rhythm_code):
    sessions_per_week = get_sessions_per_week(rhythm_code)
    if sessions_per_week == 1:
        return [0]  # Monday
    if sessions_per_week == 2:
        return [0, 3]  # Monday, Thursday
    if sessions_per_week == 3:
        return [0, 2, 4]  # Monday, Wednesday, Friday
    return []


def get_closed_weekdays():
    return set(
        ClinicClosedDay.objects.filter(is_active=True).values_list("weekday", flat=True)
    )


def get_holiday_dates():
    return set(Holiday.objects.filter(is_active=True).values_list("date", flat=True))


def get_closure_ranges():
    return list(ClinicClosureRange.objects.filter(is_active=True))


def is_in_closure_range(date_value, closure_ranges=None):
    if closure_ranges is None:
        return ClinicClosureRange.objects.filter(
            is_active=True,
            start_date__lte=date_value,
            end_date__gte=date_value,
        ).exists()
    return any(r.start_date <= date_value <= r.end_date for r in closure_ranges)


def is_working_day(
    date_value,
    closed_weekdays=None,
    holiday_dates=None,
    closure_ranges=None,
):
    if closed_weekdays is None:
        closed_weekdays = get_closed_weekdays()
    if holiday_dates is None:
        holiday_dates = get_holiday_dates()
    if closure_ranges is None:
        closure_ranges = get_closure_ranges()

    if date_value.weekday() in closed_weekdays:
        return False
    if date_value in holiday_dates:
        return False
    if is_in_closure_range(date_value, closure_ranges=closure_ranges):
        return False
    return True


def generate_session_dates(start_date, num_sessions, rhythm_code):
    if not start_date or not rhythm_code or not num_sessions or num_sessions <= 0:
        return []

    session_days = get_session_weekdays(rhythm_code)
    if not session_days:
        return []

    closed_weekdays = get_closed_weekdays()
    holiday_dates = get_holiday_dates()
    closure_ranges = get_closure_ranges()

    dates = []
    current_date = start_date
    while len(dates) < num_sessions:
        if (
            current_date.weekday() in session_days
            and is_working_day(
                current_date,
                closed_weekdays=closed_weekdays,
                holiday_dates=holiday_dates,
                closure_ranges=closure_ranges,
            )
        ):
            dates.append(current_date)
        current_date += timedelta(days=1)
    return dates


def calculate_end_date(start_date, num_sessions, rhythm_code):
    dates = generate_session_dates(
        start_date=start_date,
        num_sessions=num_sessions,
        rhythm_code=rhythm_code,
    )
    return dates[-1] if dates else None
