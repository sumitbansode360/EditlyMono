from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from .models import Document

User = get_user_model()

class DocumentViewSetTests(APITestCase):

    def setUp(self):
        # Create two users to test ownership isolation
        self.user1 = User.objects.create_user(
            username="user1@example.com",
            email="user1@example.com",
            password="Password123!",
            first_name="User",
            last_name="One"
        )
        self.user2 = User.objects.create_user(
            username="user2@example.com",
            email="user2@example.com",
            password="Password123!",
            first_name="User",
            last_name="Two"
        )

        # Create a document for each user
        self.doc1 = Document.objects.create(
            title="User 1 Document",
            content={"text": "Secret content for user 1"},
            owner=self.user1
        )
        self.doc2 = Document.objects.create(
            title="User 2 Document",
            content={"text": "Secret content for user 2"},
            owner=self.user2
        )

        # Standard router generated URLs
        self.list_url = reverse('documents-list')

    def get_detail_url(self, pk):
        return reverse('documents-detail', kwargs={'pk': pk})

    def test_list_documents_only_returns_owned_docs(self):
        """Requirement: Get all documents of the owner only (returns subset of fields)."""
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(str(response.data[0]['id']), str(self.doc1.id))
        # Verify content field is NOT returned in list view
        self.assertNotIn('content', response.data[0])

    def test_retrieve_document_returns_all_fields(self):
        """Requirement: Get specific document returns all fields."""
        self.client.force_authenticate(user=self.user1)
        url = self.get_detail_url(self.doc1.pk)
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], self.doc1.title)
        self.assertEqual(response.data['content'], self.doc1.content)
        self.assertEqual(str(response.data['owner']), str(self.user1.id))

    def test_cannot_access_other_user_document(self):
        """Requirement: Access control (Security)."""
        self.client.force_authenticate(user=self.user1)
        url = self.get_detail_url(self.doc2.pk)
        response = self.client.get(url)

        # Should return 404 because get_queryset filters by owner
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_update_document_success(self):
        """Requirement: Same owner can update content/title."""
        self.client.force_authenticate(user=self.user1)
        url = self.get_detail_url(self.doc1.pk)
        updated_data = {"title": "New Title", "content": {"new": "data"}}
        
        response = self.client.patch(url, updated_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        self.doc1.refresh_from_db()
        self.assertEqual(self.doc1.title, "New Title")
        self.assertEqual(self.doc1.content, {"new": "data"})

    def test_delete_document_success(self):
        """Requirement: Only owner can delete."""
        self.client.force_authenticate(user=self.user1)
        url = self.get_detail_url(self.doc1.pk)
        
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Document.objects.filter(pk=self.doc1.pk).exists())

    def test_unauthenticated_access_denied(self):
        """Requirement: Authentication required."""
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
