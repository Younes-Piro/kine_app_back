from datetime import date
from decimal import Decimal

from django.test import TestCase

from app_settings.models import AppOption
from payments.models import Payment

from .models import Client, Treatment
from .serializers import ClientSerializer
from .services import deactivate_client_with_cascade, deactivate_treatment_with_cascade


class DeactivateCascadeTests(TestCase):
    def setUp(self):
        self.session_rhythm = AppOption.objects.create(
            category=AppOption.CATEGORY_SESSION_RHYTHM,
            code="1_per_week",
            label="1 per week",
            sort_order=1,
            is_active=True,
        )
        self.scheduled_status = AppOption.objects.create(
            category=AppOption.CATEGORY_SESSION_STATUS,
            code="scheduled",
            label="Scheduled",
            sort_order=1,
            is_active=True,
        )
        self.completed_status = AppOption.objects.create(
            category=AppOption.CATEGORY_SESSION_STATUS,
            code="completed",
            label="Completed",
            sort_order=2,
            is_active=True,
        )
        self.cancelled_status = AppOption.objects.create(
            category=AppOption.CATEGORY_SESSION_STATUS,
            code="cancelled",
            label="Cancelled",
            sort_order=3,
            is_active=True,
        )
        AppOption.objects.create(
            category=AppOption.CATEGORY_PAYMENT_STATUS,
            code="unpaid",
            label="Unpaid",
            sort_order=1,
            is_active=True,
        )
        AppOption.objects.create(
            category=AppOption.CATEGORY_PAYMENT_STATUS,
            code="paid",
            label="Paid",
            sort_order=2,
            is_active=True,
        )

    def _create_client(self, name="Client A"):
        return Client.objects.create(full_name=name)

    def _create_treatment(self, client, prescribed_sessions=2):
        return Treatment.objects.create(
            client=client,
            type_and_site="Lumbar rehab",
            prescribed_sessions=prescribed_sessions,
            session_rhythm=self.session_rhythm,
            start_date=date(2026, 1, 5),
            session_price=Decimal("100.00"),
        )

    def test_treatment_deactivate_cascade_cancels_scheduled_and_deactivates_payments(self):
        client = self._create_client()
        treatment = self._create_treatment(client=client, prescribed_sessions=2)
        sessions = list(treatment.sessions.order_by("id"))
        self.assertEqual(len(sessions), 2)

        completed_session = sessions[0]
        completed_session.status = self.completed_status
        completed_session.save(update_fields=["status", "updated_at"])
        scheduled_session = sessions[1]

        payment = Payment.objects.create(
            treatment=treatment,
            amount=Decimal("50.00"),
            payment_date=date(2026, 1, 6),
        )
        self.assertTrue(payment.is_active)

        deactivate_treatment_with_cascade(treatment)

        treatment.refresh_from_db()
        completed_session.refresh_from_db()
        scheduled_session.refresh_from_db()
        payment.refresh_from_db()

        self.assertFalse(treatment.is_active)
        self.assertEqual(completed_session.status_id, self.completed_status.id)
        self.assertEqual(scheduled_session.status_id, self.cancelled_status.id)
        self.assertFalse(payment.is_active)

    def test_client_deactivate_cascade_only_applies_to_active_treatments(self):
        client = self._create_client(name="Client B")

        active_treatment = self._create_treatment(client=client, prescribed_sessions=1)
        active_payment = Payment.objects.create(
            treatment=active_treatment,
            amount=Decimal("40.00"),
            payment_date=date(2026, 1, 6),
        )
        active_session = active_treatment.sessions.first()

        inactive_treatment = self._create_treatment(client=client, prescribed_sessions=1)
        inactive_treatment.is_active = False
        inactive_treatment.save(update_fields=["is_active", "updated_at"])
        inactive_payment = Payment.objects.create(
            treatment=inactive_treatment,
            amount=Decimal("40.00"),
            payment_date=date(2026, 1, 7),
        )

        deactivate_client_with_cascade(client)

        client.refresh_from_db()
        active_treatment.refresh_from_db()
        inactive_treatment.refresh_from_db()
        active_payment.refresh_from_db()
        inactive_payment.refresh_from_db()
        active_session.refresh_from_db()

        self.assertFalse(client.is_active)
        self.assertFalse(active_treatment.is_active)
        self.assertEqual(active_session.status_id, self.cancelled_status.id)
        self.assertFalse(active_payment.is_active)

        self.assertFalse(inactive_treatment.is_active)
        self.assertTrue(inactive_payment.is_active)

    def test_client_create_does_not_accept_balance_input(self):
        serializer = ClientSerializer(
            data={
                "full_name": "Client C",
                "balance": "999.99",
            }
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        client = serializer.save()
        self.assertEqual(client.balance, Decimal("0"))
