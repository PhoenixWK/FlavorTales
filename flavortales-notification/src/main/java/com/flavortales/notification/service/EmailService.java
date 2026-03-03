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
}
