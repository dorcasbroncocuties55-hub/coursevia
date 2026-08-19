// ── Updated Email Notifications with Resend ──────────────────────────────────────

app.post("/api/notifications/booking-confirmation", async (req, res) => {
  try {
    const { 
      booking_id, 
      learner_email, 
      provider_email, 
      learner_name, 
      provider_name, 
      scheduled_at, 
      service_title, 
      service_mode, 
      office_address, 
      provider_phone 
    } = req.body || {};

    // Validate required fields
    if (!learner_email || !provider_email || !learner_name || !provider_name) {
      return res.status(400).json({ message: "Missing required email fields" });
    }

    // Format the scheduled date/time
    const scheduledDate = new Date(scheduled_at);
    const formattedDate = scheduledDate.toLocaleDateString("en-US", { 
      weekday: "long", 
      year: "numeric", 
      month: "long", 
      day: "numeric" 
    });
    const formattedTime = scheduledDate.toLocaleTimeString("en-US", { 
      hour: "numeric", 
      minute: "2-digit", 
      hour12: true 
    });

    // Generate email content
    const isInPerson = service_mode === "in_person";
    
    const learnerEmailContent = `Hi ${learner_name},

Your ${isInPerson ? 'in-person' : 'online'} session with ${provider_name} is confirmed! 🎉

📅 Session Details:
• Service: ${service_title}
• Date: ${formattedDate}
• Time: ${formattedTime}
• Type: ${isInPerson ? 'In-Person Meeting' : 'Online Video Call'}
${isInPerson && office_address ? `• Location: ${office_address}` : ''}
${isInPerson && provider_phone ? `• Contact: ${provider_phone}` : ''}

${isInPerson ? 
  `📍 Please arrive 5-10 minutes early. The exact address and any additional instructions will be available in your booking dashboard.` :
  `💻 Meeting link and instructions will be available in your booking dashboard before the session.`
}

View your booking: ${APP_URL}/dashboard/bookings

Need help? Contact support or message your provider directly through the platform.

Best regards,
The Coursevia Team`;

    const providerEmailContent = `Hi ${provider_name},

You have a new booking! 📅

👤 Student: ${learner_name}
📅 Date: ${formattedDate}
⏰ Time: ${formattedTime}
📋 Service: ${service_title}
${isInPerson ? '📍 Mode: In-Person Meeting' : '💻 Mode: Online Video Call'}
${isInPerson && office_address ? `📍 Location: ${office_address}` : ''}
${isInPerson && provider_phone ? `📞 Contact: ${provider_phone}` : ''}

${isInPerson ? 
  `Please confirm your availability and ensure your office address is up to date in your profile.` :
  `Please prepare your meeting link and ensure you have a stable internet connection.`
}

Manage booking: ${APP_URL}/dashboard/bookings

Best regards,
The Coursevia Team`;

    // Send emails using Resend (if configured) or fallback to console
    if (resend && RESEND_API_KEY) {
      try {
        // Send learner email
        await resend.emails.send({
          from: RESEND_FROM_EMAIL,
          to: learner_email,
          subject: `Booking Confirmed: ${service_title} with ${provider_name}`,
          text: learnerEmailContent,
        });

        // Send provider email  
        await resend.emails.send({
          from: RESEND_FROM_EMAIL,
          to: provider_email,
          subject: `New Booking: ${learner_name} - ${service_title}`,
          text: providerEmailContent,
        });

        console.log(`[Email] Booking confirmation emails sent successfully for booking ${booking_id}`);
      } catch (emailError) {
        console.error("[Email] Failed to send booking emails:", emailError);
        // Continue with in-app notification even if email fails
      }
    } else {
      // Fallback: Log to console (for development/testing)
      console.log("[Email] Resend not configured - logging email content:");
      console.log("Learner email:", { to: learner_email, subject: `Booking Confirmed: ${service_title}`, content: learnerEmailContent });
      console.log("Provider email:", { to: provider_email, subject: `New Booking: ${learner_name}`, content: providerEmailContent });
    }

    // Create in-app notifications
    if (supabaseAdmin) {
      await supabaseAdmin.from("notifications").insert([
        {
          user_id: req.body.learner_id,
          type: "booking_confirmation",
          title: "Booking Confirmed",
          message: isInPerson
            ? `Your in-person session with ${provider_name} is confirmed for ${formattedDate} at ${formattedTime}. Address details are available in your dashboard.`
            : `Your online session with ${provider_name} is confirmed for ${formattedDate} at ${formattedTime}. Meeting details will be available in your dashboard.`,
        },
        {
          user_id: req.body.provider_id,
          type: "new_booking",
          title: "New Booking Received",
          message: `${learner_name} has booked a ${isInPerson ? 'in-person' : 'online'} session (${service_title}) for ${formattedDate} at ${formattedTime}.`,
        }
      ]);
    }

    return res.json({
      success: true,
      message: resend && RESEND_API_KEY ? "Booking confirmation emails sent successfully." : "Booking confirmation logged (email service not configured).",
      learner_email_content: learnerEmailContent,
      provider_email_content: providerEmailContent,
    });

  } catch (error) {
    console.error("[Email] Booking confirmation error:", error);
    return res.status(500).json({ 
      message: error instanceof Error ? error.message : "Could not send booking confirmation." 
    });
  }
});