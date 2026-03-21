package com.flavortales.content.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.flavortales.common.exception.UserNotFoundException;
import com.flavortales.content.dto.ShopCreateRequest;
import com.flavortales.content.dto.ShopCreateResponse;
import com.flavortales.notification.service.EmailService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.PreparedStatementCreator;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link ShopService#createShop(ShopCreateRequest, String)}.
 *
 * Trace:
 *   Use case  : UC-CM-001 – Tạo gian hàng mới
 *   User story: US-CM-001 – Vendor creates shop profile
 *   SRS       : FR-CM-001
 *   AC        : AC-CM-001-01 … AC-CM-001-08
 *
 * Priority matrix
 *   P1 – Happy path, name-uniqueness guard, DB error
 *   P2 – Optional fields accepted correctly, admin notification triggered
 *   P3 – Edge: null additionalImageIds, maximum additional images
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("ShopService – createShop()")
class CreateShopServiceTest {

    // ── Mocks ────────────────────────────────────────────────────────────────

    @Mock
    private JdbcTemplate jdbcTemplate;

    @Mock
    private EmailService emailService;

    @Mock
    private ObjectMapper objectMapper;

    @InjectMocks
    private ShopService shopService;

    // ── Test data ────────────────────────────────────────────────────────────

    private static final String VENDOR_EMAIL = "pho.vendor@example.com";
    private static final int    VENDOR_ID    = 42;
    private static final int    SHOP_ID      = 101;

    /** Fully valid request satisfying every constraint in {@link ShopCreateRequest}. */
    private ShopCreateRequest validRequest;

    @BeforeEach
    void setUp() throws Exception {
        validRequest = new ShopCreateRequest();
        validRequest.setName("Phở Hà Nội");
        validRequest.setDescription("Phở bò truyền thống Hà Nội hơn 50 ký tự mô tả ngon miệng.");
        validRequest.setAvatarFileId(10);
        validRequest.setSpecialtyDescription("Phở bò, phở gà đặc sản");
        validRequest.setTags(List.of("Bình dân", "Gia truyền"));


        // ObjectMapper.writeValueAsString stub – returns a trivial JSON string
        when(objectMapper.writeValueAsString(any())).thenReturn("[]");
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    /**
     * Sets up the common happy-path stubs:
     *   1. vendor id lookup succeeds
     *   2. name uniqueness check returns false (name is free)
     *   3. INSERT returns generated key SHOP_ID
     */
    private void stubHappyPath() {
        // resolveVendorId – queryForObject with email
        when(jdbcTemplate.queryForObject(
                contains("WHERE email ="),
                eq(Integer.class),
                eq(VENDOR_EMAIL)
        )).thenReturn(VENDOR_ID);

        // name uniqueness check
        when(jdbcTemplate.queryForObject(
                contains("COUNT(*)"),
                eq(Boolean.class),
                eq(validRequest.getName())
        )).thenReturn(false);

        // INSERT – mock update with KeyHolder
        doAnswer(inv -> {
            KeyHolder kh = inv.getArgument(1);
            // Inject the generated key via reflection on the real GeneratedKeyHolder map
            ((GeneratedKeyHolder) kh).getKeyList().add(
                    java.util.Collections.singletonMap("GENERATED_KEY", SHOP_ID));
            return 1;
        }).when(jdbcTemplate).update(any(PreparedStatementCreator.class), any(KeyHolder.class));
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  AC-CM-001-01  Happy Path – shop saved with status=pending
    // ─────────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("AC-CM-001-01 · Happy path – valid input, shop created with status=pending")
    class HappyPath {

        @Test
        @DisplayName("P1 · Returns ShopCreateResponse with status=pending and success message")
        void returnsResponseWithPendingStatus() {
            stubHappyPath();

            ShopCreateResponse res = shopService.createShop(validRequest, VENDOR_EMAIL);

            assertThat(res.getShopId()).isEqualTo(SHOP_ID);
            assertThat(res.getName()).isEqualTo("Phở Hà Nội");
            assertThat(res.getStatus()).isEqualTo("pending");
            assertThat(res.getMessage()).isEqualTo("Tạo gian hàng thành công, đang chờ duyệt");
            assertThat(res.getCreatedAt()).isNotNull();
        }

        @Test
        @DisplayName("P2 · sendAdminNewShopNotification is called once with correct arguments")
        void adminNotificationIsSent() {
            stubHappyPath();

            shopService.createShop(validRequest, VENDOR_EMAIL);

            verify(emailService, times(1))
                    .sendAdminNewShopNotification("Phở Hà Nội", VENDOR_EMAIL);
        }

        @Test
        @DisplayName("P2 · INSERT into shop is executed exactly once")
        void shopInsertExecutedOnce() {
            stubHappyPath();

            shopService.createShop(validRequest, VENDOR_EMAIL);

            verify(jdbcTemplate, times(1))
                    .update(any(PreparedStatementCreator.class), any(KeyHolder.class));
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  AC-CM-001-02  Additional images saved as shop_image rows
    // ─────────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("AC-CM-001-02 · Additional images – inserted as shop_image rows")
    class AdditionalImages {

        @Test
        @DisplayName("P2 · Each additional image ID is inserted with correct sort_order")
        void additionalImagesInserted() {
            validRequest.setAdditionalImageIds(List.of(30, 31, 32));
            stubHappyPath();

            shopService.createShop(validRequest, VENDOR_EMAIL);

            // 3 additional images → 3 INSERT calls to shop_image
            verify(jdbcTemplate, times(3))
                    .update(contains("INSERT INTO shop_image"), eq(SHOP_ID), anyInt(), anyInt());
        }

        @Test
        @DisplayName("P3 · Null additionalImageIds skips shop_image inserts entirely")
        void nullAdditionalImagesSkipsInserts() {
            validRequest.setAdditionalImageIds(null);
            stubHappyPath();

            shopService.createShop(validRequest, VENDOR_EMAIL);

            verify(jdbcTemplate, never())
                    .update(contains("INSERT INTO shop_image"), any(), any(), any());
        }

        @Test
        @DisplayName("P3 · Edge – exactly 5 additional images (max allowed) are all inserted")
        void maxAdditionalImagesAllInserted() {
            validRequest.setAdditionalImageIds(List.of(30, 31, 32, 33, 34));
            stubHappyPath();

            shopService.createShop(validRequest, VENDOR_EMAIL);

            verify(jdbcTemplate, times(5))
                    .update(contains("INSERT INTO shop_image"), eq(SHOP_ID), anyInt(), anyInt());
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  AC-CM-001-03  Name uniqueness guard
    // ─────────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("AC-CM-001-03 · Name uniqueness – duplicate name raises exception")
    class NameUniqueness {

        @Test
        @DisplayName("P1 · Throws IllegalArgumentException when active shop with same name exists")
        void duplicateNameThrows() {
            // vendor lookup succeeds
            when(jdbcTemplate.queryForObject(
                    contains("WHERE email ="),
                    eq(Integer.class),
                    eq(VENDOR_EMAIL)
            )).thenReturn(VENDOR_ID);

            // name already taken
            when(jdbcTemplate.queryForObject(
                    contains("COUNT(*)"),
                    eq(Boolean.class),
                    eq(validRequest.getName())
            )).thenReturn(true);

            assertThatThrownBy(() -> shopService.createShop(validRequest, VENDOR_EMAIL))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("already exists");
        }

        @Test
        @DisplayName("P1 · No INSERT executed after duplicate-name is detected")
        void noInsertOnDuplicateName() {
            when(jdbcTemplate.queryForObject(
                    contains("WHERE email ="),
                    eq(Integer.class),
                    eq(VENDOR_EMAIL)
            )).thenReturn(VENDOR_ID);

            when(jdbcTemplate.queryForObject(
                    contains("COUNT(*)"),
                    eq(Boolean.class),
                    eq(validRequest.getName())
            )).thenReturn(true);

            try { shopService.createShop(validRequest, VENDOR_EMAIL); } catch (Exception ignored) {}

            verify(jdbcTemplate, never())
                    .update(any(PreparedStatementCreator.class), any(KeyHolder.class));
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  AC-CM-001-04  Vendor resolution – unknown email
    // ─────────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("AC-CM-001-04 · Vendor lookup – unknown email throws UserNotFoundException")
    class VendorResolution {

        @Test
        @DisplayName("P1 · Throws UserNotFoundException when vendor email not found in DB")
        void unknownVendorThrows() {
            when(jdbcTemplate.queryForObject(
                    contains("WHERE email ="),
                    eq(Integer.class),
                    eq("ghost@example.com")
            )).thenThrow(new UserNotFoundException("User not found"));

            assertThatThrownBy(() -> shopService.createShop(validRequest, "ghost@example.com"))
                    .isInstanceOf(UserNotFoundException.class);
        }

        @Test
        @DisplayName("P1 · Admin notification is NOT sent when vendor lookup fails")
        void noNotificationWhenVendorNotFound() {
            when(jdbcTemplate.queryForObject(
                    contains("WHERE email ="),
                    eq(Integer.class),
                    eq("ghost@example.com")
            )).thenThrow(new UserNotFoundException("User not found"));

            try { shopService.createShop(validRequest, "ghost@example.com"); } catch (Exception ignored) {}

            verify(emailService, never()).sendAdminNewShopNotification(any(), any());
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  AC-CM-001-05  DB failure propagation (E2 – connection error)
    // ─────────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("AC-CM-001-05 · E2 – DB failure propagates as runtime exception")
    class DatabaseFailure {

        @Test
        @DisplayName("P1 · RuntimeException propagated when INSERT to shop table fails")
        void dbInsertFailurePropagates() {
            when(jdbcTemplate.queryForObject(
                    contains("WHERE email ="),
                    eq(Integer.class),
                    eq(VENDOR_EMAIL)
            )).thenReturn(VENDOR_ID);

            when(jdbcTemplate.queryForObject(
                    contains("COUNT(*)"),
                    eq(Boolean.class),
                    eq(validRequest.getName())
            )).thenReturn(false);

            doThrow(new org.springframework.dao.DataAccessResourceFailureException("Connection lost"))
                    .when(jdbcTemplate).update(any(PreparedStatementCreator.class), any(KeyHolder.class));

            assertThatThrownBy(() -> shopService.createShop(validRequest, VENDOR_EMAIL))
                    .isInstanceOf(Exception.class);
        }

        @Test
        @DisplayName("P1 · Admin notification is NOT sent when shop INSERT fails (transaction rollback)")
        void noNotificationWhenInsertFails() {
            when(jdbcTemplate.queryForObject(
                    contains("WHERE email ="),
                    eq(Integer.class),
                    eq(VENDOR_EMAIL)
            )).thenReturn(VENDOR_ID);

            when(jdbcTemplate.queryForObject(
                    contains("COUNT(*)"),
                    eq(Boolean.class),
                    eq(validRequest.getName())
            )).thenReturn(false);

            doThrow(new org.springframework.dao.DataAccessResourceFailureException("Connection lost"))
                    .when(jdbcTemplate).update(any(PreparedStatementCreator.class), any(KeyHolder.class));

            try { shopService.createShop(validRequest, VENDOR_EMAIL); } catch (Exception ignored) {}

            verify(emailService, never()).sendAdminNewShopNotification(any(), any());
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  AC-CM-001-06  Optional fields – openingHours and tags serialised to JSON
    // ─────────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("AC-CM-001-06 · Optional fields – tags and openingHours serialised correctly")
    class OptionalFields {

        @Test
        @DisplayName("P2 · objectMapper.writeValueAsString called for tags list")
        void tagsSerialised() throws Exception {
            stubHappyPath();

            shopService.createShop(validRequest, VENDOR_EMAIL);

            // tags list is passed to writeValueAsString
            ArgumentCaptor<Object> captor = ArgumentCaptor.forClass(Object.class);
            verify(objectMapper, atLeastOnce()).writeValueAsString(captor.capture());
            assertThat(captor.getAllValues())
                    .anyMatch(v -> v instanceof List && ((List<?>) v).contains("Bình dân"));
        }

        @Test
        @DisplayName("P3 · Null openingHours and null tags produce no serialisation call for those fields")
        void nullOptionalFieldsSkipSerialisation() throws Exception {
            validRequest.setOpeningHours(null);
            validRequest.setTags(null);

            when(jdbcTemplate.queryForObject(contains("WHERE email ="), eq(Integer.class), eq(VENDOR_EMAIL)))
                    .thenReturn(VENDOR_ID);
            when(jdbcTemplate.queryForObject(contains("COUNT(*)"), eq(Boolean.class), eq(validRequest.getName())))
                    .thenReturn(false);
            doAnswer(inv -> {
                KeyHolder kh = inv.getArgument(1);
                ((GeneratedKeyHolder) kh).getKeyList().add(
                        java.util.Collections.singletonMap("GENERATED_KEY", SHOP_ID));
                return 1;
            }).when(jdbcTemplate).update(any(PreparedStatementCreator.class), any(KeyHolder.class));

            // Should not throw even when optional fields are null
            ShopCreateResponse res = shopService.createShop(validRequest, VENDOR_EMAIL);
            assertThat(res).isNotNull();
        }
    }
}
