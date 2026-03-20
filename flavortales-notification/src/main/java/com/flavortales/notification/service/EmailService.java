package com.flavortales.notification.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;
    private final TemplateEngine templateEngine;

    @Value("${app.mail.from}")
    private String fromEmail;

    @Value("${app.mail.from-name}")
    private String fromName;

    @Value("${app.mail.admin-email}")
    private String adminEmail;

    @Value("${app.mail.support-email}")
    private String supportEmail;

    @Value("${app.mail.company-name}")
    private String companyName;

    @Value("${app.verification.expiration-minutes}")
    private int expirationMinutes;

    @Async
    public void sendVendorVerificationEmail(String toEmail, String verificationCode) {
        try {
            Context ctx = new Context();
            ctx.setVariable("verificationCode", verificationCode);
            ctx.setVariable("expirationMinutes", expirationMinutes);
            ctx.setVariable("companyName", companyName);
            ctx.setVariable("supportEmail", supportEmail);

            String htmlBody = templateEngine.process("vendor-verification-email", ctx);

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromEmail, fromName);
            helper.setTo(toEmail);
            helper.setSubject("Account Verification - " + companyName);
            helper.setText(htmlBody, true);

            mailSender.send(message);
            log.info("Verification email sent to {}", toEmail);
        } catch (MessagingException | java.io.UnsupportedEncodingException e) {
            log.error("Failed to send verification email to {}: {}", toEmail, e.getMessage());
        }
    }

    @Async
    public void sendPasswordResetEmail(String toEmail, String resetToken, int expirationMinutes) {
        try {
            Context ctx = new Context();
            ctx.setVariable("resetToken", resetToken);
            ctx.setVariable("expirationMinutes", expirationMinutes);
            ctx.setVariable("companyName", companyName);
            ctx.setVariable("supportEmail", supportEmail);

            String htmlBody = templateEngine.process("password-reset-email", ctx);

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromEmail, fromName);
            helper.setTo(toEmail);
            helper.setSubject("Password Reset Request - " + companyName);
            helper.setText(htmlBody, true);

            mailSender.send(message);
            log.info("Password reset email sent to {}", toEmail);
        } catch (MessagingException | java.io.UnsupportedEncodingException e) {
            log.error("Failed to send password reset email to {}: {}", toEmail, e.getMessage());
        }
    }

    @Async
    public void sendAdminNewVendorNotification(String vendorEmail, String vendorUsername) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail, fromName);
            helper.setTo(adminEmail);
            helper.setSubject("New Vendor Registration Pending Review");
            helper.setText(buildAdminNotificationBody(vendorEmail, vendorUsername), false);

            mailSender.send(message);
            log.info("Admin notification sent for new vendor: {}", vendorEmail);
        } catch (MessagingException | java.io.UnsupportedEncodingException e) {
            log.error("Failed to send admin notification for vendor {}: {}", vendorEmail, e.getMessage());
        }
    }

    private String buildAdminNotificationBody(String vendorEmail, String vendorUsername) {
        return "Hello Admin,\n\n" +
                "A new vendor has registered and is pending approval.\n\n" +
                "Vendor Details:\n" +
                "  Username : " + vendorUsername + "\n" +
                "  Email    : " + vendorEmail + "\n\n" +
                "Please log in to the admin panel to review and approve or reject this account.\n\n" +
                "Best regards,\n" +
                companyName;
    }

    // ── POI creation notification (FR-PM-001) ─────────────────────────────────

    @Async
    public void sendPoiUpdatedEmail(String toEmail, String poiName) {
        try {
            Context ctx = new Context();
            ctx.setVariable("poiName", poiName);
            ctx.setVariable("companyName", companyName);
            ctx.setVariable("supportEmail", supportEmail);

            String htmlBody = templateEngine.process("poi-updated-email", ctx);

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromEmail, fromName);
            helper.setTo(toEmail);
            helper.setSubject("Your POI has been updated – " + companyName);
            helper.setText(htmlBody, true);

            mailSender.send(message);
            log.info("POI update email sent to {}", toEmail);
        } catch (MessagingException | java.io.UnsupportedEncodingException e) {
            log.error("Failed to send POI update email to {}: {}", toEmail, e.getMessage());
        }
    }

    @Async
    public void sendPoiCreatedEmail(String toEmail, String poiName) {
        try {
            Context ctx = new Context();
            ctx.setVariable("poiName", poiName);
            ctx.setVariable("companyName", companyName);
            ctx.setVariable("supportEmail", supportEmail);

            String htmlBody = templateEngine.process("poi-created-email", ctx);

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromEmail, fromName);
            helper.setTo(toEmail);
            helper.setSubject("Your POI has been created – " + companyName);
            helper.setText(htmlBody, true);

            mailSender.send(message);
            log.info("POI creation email sent to {}", toEmail);
        } catch (MessagingException | java.io.UnsupportedEncodingException e) {
            log.error("Failed to send POI creation email to {}: {}", toEmail, e.getMessage());
        }
    }

    // ── Shop profile notification (FR-CM-001) ─────────────────────────────────

    /**
     * Notifies admin that a new shop profile has been submitted and is pending review.
     */
    @Async
    public void sendAdminNewShopNotification(String shopName, String vendorEmail) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail, fromName);
            helper.setTo(adminEmail);
            helper.setSubject("New Shop Profile Pending Review – " + companyName);
            helper.setText(buildShopNotificationBody(shopName, vendorEmail), false);

            mailSender.send(message);
            log.info("Admin notified of new shop: {} by {}", shopName, vendorEmail);
        } catch (MessagingException | java.io.UnsupportedEncodingException e) {
            log.error("Failed to send admin shop notification for {}: {}", shopName, e.getMessage());
        }
    }

    private String buildShopNotificationBody(String shopName, String vendorEmail) {
        return "Hello Admin,\n\n" +
                "A new shop profile has been submitted and is pending your review.\n\n" +
                "Shop Details:\n" +
                "  Shop Name : " + shopName + "\n" +
                "  Vendor    : " + vendorEmail + "\n\n" +
                "Please log in to the admin panel to review and approve or reject this shop.\n\n" +
                "Best regards,\n" +
                companyName;
    }

    // ── Shop review result notifications ──────────────────────────────────────

    /**
     * Notifies vendor that their shop (and linked POI) has been approved.
     */
    @Async
    public void sendShopApprovedEmail(String toEmail, String shopName, String notes) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromEmail, fromName);
            helper.setTo(toEmail);
            helper.setSubject("Your shop has been approved – " + companyName);
            helper.setText(buildShopApprovedBody(shopName, notes), false);
            mailSender.send(message);
            log.info("Shop approved email sent to {}", toEmail);
        } catch (MessagingException | java.io.UnsupportedEncodingException e) {
            log.error("Failed to send shop approved email to {}: {}", toEmail, e.getMessage());
        }
    }

    /**
     * Notifies vendor that their shop (and linked POI) has been rejected.
     */
    @Async
    public void sendShopRejectedEmail(String toEmail, String shopName, String notes) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromEmail, fromName);
            helper.setTo(toEmail);
            helper.setSubject("Your shop submission was declined – " + companyName);
            helper.setText(buildShopRejectedBody(shopName, notes), false);
            mailSender.send(message);
            log.info("Shop rejected email sent to {}", toEmail);
        } catch (MessagingException | java.io.UnsupportedEncodingException e) {
            log.error("Failed to send shop rejected email to {}: {}", toEmail, e.getMessage());
        }
    }

    private String buildShopApprovedBody(String shopName, String notes) {
        StringBuilder sb = new StringBuilder();
        sb.append("Hello,\n\n")
          .append("Great news! Your shop \"").append(shopName).append("\" and its linked location (POI) ")
          .append("have been reviewed and approved.\n\n")
          .append("Your shop is now live and visible to customers.\n");
        if (notes != null && !notes.isBlank()) {
            sb.append("\nNote from admin:\n").append(notes).append("\n");
        }
        sb.append("\nBest regards,\n").append(companyName);
        return sb.toString();
    }

    private String buildShopRejectedBody(String shopName, String notes) {
        StringBuilder sb = new StringBuilder();
        sb.append("Hello,\n\n")
          .append("We regret to inform you that your shop \"").append(shopName)
          .append("\" and its linked location (POI) have not been approved at this time.\n");
        if (notes != null && !notes.isBlank()) {
            sb.append("\nReason / notes from admin:\n").append(notes).append("\n");
        }
        sb.append("\nIf you have questions, please contact us at ").append(supportEmail).append(".\n")
          .append("\nBest regards,\n").append(companyName);
        return sb.toString();
    }
}

