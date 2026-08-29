from django.core import mail
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from .models import Document, DocumentCollaboration

User = get_user_model()


class DocumentViewSetTests(APITestCase):

    def setUp(self):
        self.user1 = User.objects.create_user(
            username="user1@example.com", email="user1@example.com",
            password="Password123!", first_name="User", last_name="One",
            is_active=True,
        )
        self.user2 = User.objects.create_user(
            username="user2@example.com", email="user2@example.com",
            password="Password123!", first_name="User", last_name="Two",
            is_active=True,
        )

        self.doc1 = Document.objects.create(
            title="User 1 Document", content={"text": "Secret content for user 1"}, owner=self.user1
        )
        self.doc2 = Document.objects.create(
            title="User 2 Document", content={"text": "Secret content for user 2"}, owner=self.user2
        )

        self.list_url = reverse('documents-list')

    def get_detail_url(self, pk):
        return reverse('documents-detail', kwargs={'pk': pk})

    def test_create_document_returns_id_for_redirect(self):
        self.client.force_authenticate(user=self.user1)
        data = {"title": "New Doc", "content": {}}
        response = self.client.post(self.list_url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('id', response.data)
        self.assertEqual(response.data['message'], "Document created successfully")
        self.assertTrue(len(str(response.data['id'])) > 0)

    def test_create_document_reuses_empty_draft(self):
        self.client.force_authenticate(user=self.user1)
        res1 = self.client.post(self.list_url, {}, format='json')
        res2 = self.client.post(self.list_url, {}, format='json')

        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        self.assertEqual(res1.data['id'], res2.data['id'])
        self.assertEqual(Document.objects.filter(owner=self.user1).count(), 2)

    def test_list_documents_only_returns_owned_and_shared_docs(self):
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(str(response.data[0]['id']), str(self.doc1.id))
        self.assertNotIn('content', response.data[0])
        self.assertEqual(response.data[0]['role'], 'owner')

    def test_retrieve_document_returns_all_fields(self):
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.get_detail_url(self.doc1.pk))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], self.doc1.title)
        self.assertEqual(response.data['content'], self.doc1.content)
        self.assertEqual(str(response.data['owner']), str(self.user1.id))
        self.assertEqual(response.data['role'], 'owner')

    def test_cannot_access_other_user_document(self):
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.get_detail_url(self.doc2.pk))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_update_document_success(self):
        self.client.force_authenticate(user=self.user1)
        updated_data = {"title": "New Title", "content": {"new": "data"}}
        response = self.client.patch(self.get_detail_url(self.doc1.pk), updated_data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.doc1.refresh_from_db()
        self.assertEqual(self.doc1.title, "New Title")
        self.assertEqual(self.doc1.content, {"new": "data"})

    def test_delete_document_success(self):
        self.client.force_authenticate(user=self.user1)
        response = self.client.delete(self.get_detail_url(self.doc1.pk))
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Document.objects.filter(pk=self.doc1.pk).exists())

    def test_unauthenticated_access_denied(self):
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class CollaborationInviteTests(APITestCase):
    """Covers the invite endpoint: existing active user, existing inactive
    user, and a completely unregistered email — plus the resend behavior."""

    def setUp(self):
        self.owner = User.objects.create_user(
            username="owner@example.com", email="owner@example.com",
            password="Password123!", first_name="Owner", last_name="User", is_active=True,
        )
        self.active_collaborator = User.objects.create_user(
            username="collab@example.com", email="collab@example.com",
            password="Password123!", first_name="Collab", last_name="User", is_active=True,
        )
        self.inactive_collaborator = User.objects.create_user(
            username="pending@example.com", email="pending@example.com",
            password="Password123!", first_name="Pending", last_name="User", is_active=False,
        )
        self.document = Document.objects.create(
            title="Shared Document", content={"text": "Shared content"}, owner=self.owner
        )
        self.invite_url = reverse('collaborations-list')

    def invite(self, email, role="editor", document_id=None):
        return self.client.post(
            self.invite_url,
            {"document_id": str(document_id or self.document.id), "email": email, "role": role},
            format='json',
        )

    def test_invite_existing_active_user_grants_active_access(self):
        self.client.force_authenticate(user=self.owner)
        response = self.invite("collab@example.com", role="editor")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        collab = DocumentCollaboration.objects.get(document=self.document, user=self.active_collaborator)
        self.assertEqual(collab.role, "editor")
        self.assertEqual(collab.status, DocumentCollaboration.Status.ACTIVE)
        self.assertIsNone(collab.invited_email)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn(self.document.title, mail.outbox[0].subject)
        self.assertEqual(mail.outbox[0].to, ["collab@example.com"])

    def test_invite_existing_inactive_user_links_but_stays_pending(self):
        self.client.force_authenticate(user=self.owner)
        response = self.invite("pending@example.com", role="viewer")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        collab = DocumentCollaboration.objects.get(document=self.document, user=self.inactive_collaborator)
        self.assertEqual(collab.status, DocumentCollaboration.Status.PENDING)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("activate", mail.outbox[0].subject.lower())

    def test_invite_nonexistent_email_creates_pending_invite(self):
        """This is the core fix: inviting a stranger no longer 404s."""
        self.client.force_authenticate(user=self.owner)
        response = self.invite("stranger@example.com", role="editor")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        collab = DocumentCollaboration.objects.get(document=self.document, invited_email="stranger@example.com")
        self.assertIsNone(collab.user)
        self.assertEqual(collab.status, DocumentCollaboration.Status.PENDING)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("signup", mail.outbox[0].body.lower())

    def test_invite_self_fails(self):
        self.client.force_authenticate(user=self.owner)
        response = self.invite("owner@example.com")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_reinviting_same_email_resends_instead_of_failing(self):
        """This is the reported bug: previously returned 400 'already a
        collaborator' and sent no email at all."""
        self.client.force_authenticate(user=self.owner)

        first = self.invite("collab@example.com", role="viewer")
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)

        second = self.invite("collab@example.com", role="viewer")
        self.assertEqual(second.status_code, status.HTTP_200_OK)

        self.assertEqual(
            DocumentCollaboration.objects.filter(document=self.document, user=self.active_collaborator).count(), 1
        )
        self.assertEqual(len(mail.outbox), 2)  # invite email sent both times

    def test_reinviting_updates_role(self):
        self.client.force_authenticate(user=self.owner)
        self.invite("collab@example.com", role="viewer")
        self.invite("collab@example.com", role="editor")

        collab = DocumentCollaboration.objects.get(document=self.document, user=self.active_collaborator)
        self.assertEqual(collab.role, "editor")

    def test_reinviting_pending_stranger_resends_and_does_not_duplicate(self):
        self.client.force_authenticate(user=self.owner)
        self.invite("stranger@example.com")
        response = self.invite("stranger@example.com")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            DocumentCollaboration.objects.filter(document=self.document, invited_email="stranger@example.com").count(), 1
        )
        self.assertEqual(len(mail.outbox), 2)

    def test_only_owner_can_invite(self):
        self.client.force_authenticate(user=self.active_collaborator)
        response = self.invite("someoneelse@example.com")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_list_collaborators_filtered_by_document(self):
        self.client.force_authenticate(user=self.owner)
        self.invite("collab@example.com")
        self.invite("stranger@example.com")

        response = self.client.get(f"{self.invite_url}?document_id={self.document.id}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)


class CollaborationAccessTests(APITestCase):
    """Covers permission enforcement once a collaboration exists."""

    def setUp(self):
        self.owner = User.objects.create_user(
            username="owner2@example.com", email="owner2@example.com",
            password="Password123!", first_name="Owner", last_name="User", is_active=True,
        )
        self.collaborator = User.objects.create_user(
            username="collab2@example.com", email="collab2@example.com",
            password="Password123!", first_name="Collab", last_name="User", is_active=True,
        )
        self.document = Document.objects.create(
            title="Shared Document", content={"text": "Shared content"}, owner=self.owner
        )

    def make_collab(self, role, status_=DocumentCollaboration.Status.ACTIVE):
        return DocumentCollaboration.objects.create(
            document=self.document, user=self.collaborator, role=role,
            status=status_, invited_by=self.owner,
        )

    def test_viewer_cannot_edit_document(self):
        self.make_collab(DocumentCollaboration.Role.VIEWER)
        self.client.force_authenticate(user=self.collaborator)
        url = reverse('documents-detail', kwargs={'pk': self.document.pk})
        response = self.client.patch(url, {"title": "Updated Title"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_editor_can_edit_document(self):
        self.make_collab(DocumentCollaboration.Role.EDITOR)
        self.client.force_authenticate(user=self.collaborator)
        url = reverse('documents-detail', kwargs={'pk': self.document.pk})
        response = self.client.patch(url, {"title": "Updated Title"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_pending_collaborator_cannot_access_document_yet(self):
        self.make_collab(DocumentCollaboration.Role.EDITOR, status_=DocumentCollaboration.Status.PENDING)
        self.client.force_authenticate(user=self.collaborator)
        url = reverse('documents-detail', kwargs={'pk': self.document.pk})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_collaborator_cannot_delete_document(self):
        self.make_collab(DocumentCollaboration.Role.EDITOR)
        self.client.force_authenticate(user=self.collaborator)
        url = reverse('documents-detail', kwargs={'pk': self.document.pk})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_list_includes_shared_documents(self):
        self.make_collab(DocumentCollaboration.Role.VIEWER)
        self.client.force_authenticate(user=self.collaborator)
        response = self.client.get(reverse('documents-list'))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(str(response.data[0]['id']), str(self.document.id))
        self.assertEqual(response.data[0]['role'], 'viewer')

    def test_list_excludes_pending_shared_documents(self):
        self.make_collab(DocumentCollaboration.Role.VIEWER, status_=DocumentCollaboration.Status.PENDING)
        self.client.force_authenticate(user=self.collaborator)
        response = self.client.get(reverse('documents-list'))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_remove_collaborator(self):
        collab = self.make_collab(DocumentCollaboration.Role.VIEWER)
        self.client.force_authenticate(user=self.owner)
        url = reverse('collaborations-detail', kwargs={'pk': collab.pk})

        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(DocumentCollaboration.objects.count(), 0)


class RegistrationAndActivationLinkingTests(APITestCase):
    """Covers the two hooks that close the loop for inviting a stranger:
    registration links the pending row by email, activation flips it live."""

    def setUp(self):
        self.owner = User.objects.create_user(
            username="owner3@example.com", email="owner3@example.com",
            password="Password123!", first_name="Owner", last_name="User", is_active=True,
        )
        self.document = Document.objects.create(
            title="Invite Target Document", content={}, owner=self.owner
        )
        self.invite_url = reverse('collaborations-list')
        self.register_url = reverse('register')

    def test_registering_with_invited_email_links_collaboration(self):
        self.client.force_authenticate(user=self.owner)
        self.client.post(
            self.invite_url,
            {"document_id": str(self.document.id), "email": "newperson@example.com", "role": "editor"},
            format='json',
        )
        self.client.force_authenticate(user=None)

        collab = DocumentCollaboration.objects.get(document=self.document, invited_email="newperson@example.com")
        self.assertIsNone(collab.user)

        register_response = self.client.post(self.register_url, {
            "username": "newperson",
            "email": "newperson@example.com",
            "password": "SecurePassword123!",
            "first_name": "New",
            "last_name": "Person",
        })
        self.assertEqual(register_response.status_code, status.HTTP_201_CREATED)

        collab.refresh_from_db()
        new_user = User.objects.get(email="newperson@example.com")
        self.assertEqual(collab.user, new_user)
        self.assertIsNone(collab.invited_email)
        # Still pending — account isn't active yet.
        self.assertEqual(collab.status, DocumentCollaboration.Status.PENDING)

    def test_activating_account_flips_linked_invite_to_active(self):
        from userauth.utils import account_activation_token
        from django.utils.http import urlsafe_base64_encode
        from django.utils.encoding import force_bytes

        self.client.force_authenticate(user=self.owner)
        self.client.post(
            self.invite_url,
            {"document_id": str(self.document.id), "email": "newperson2@example.com", "role": "viewer"},
            format='json',
        )
        self.client.force_authenticate(user=None)

        self.client.post(self.register_url, {
            "username": "newperson2",
            "email": "newperson2@example.com",
            "password": "SecurePassword123!",
            "first_name": "New",
            "last_name": "Person",
        })

        new_user = User.objects.get(email="newperson2@example.com")
        uid = urlsafe_base64_encode(force_bytes(new_user.pk))
        token = account_activation_token.make_token(new_user)
        activate_url = reverse('activate', kwargs={'uidb64': uid, 'token': token})

        response = self.client.get(activate_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        collab = DocumentCollaboration.objects.get(document=self.document, user=new_user)
        self.assertEqual(collab.status, DocumentCollaboration.Status.ACTIVE)
        self.assertIsNotNone(collab.accepted_at)

        # And now the document actually shows up on their dashboard.
        self.client.force_authenticate(user=new_user)
        list_response = self.client.get(reverse('documents-list'))
        self.assertEqual(len(list_response.data), 1)
        self.assertEqual(str(list_response.data[0]['id']), str(self.document.id))