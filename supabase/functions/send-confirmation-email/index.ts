import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ConfirmationEmailRequest {
  email: string;
  name?: string;
  confirmationUrl?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name = "bạn", confirmationUrl }: ConfirmationEmailRequest = await req.json();

    console.log(`Sending confirmation email to: ${email}`);

    const emailResponse = await resend.emails.send({
      from: "Hippo Lovely <onboarding@resend.dev>",
      to: [email],
      subject: "Xác nhận email của bạn - Hippo Lovely",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #e11d48; margin: 0;">💕 Hippo Lovely</h1>
            <p style="color: #666; margin-top: 10px;">Kết nối những tâm hồn đồng điệu</p>
          </div>
          
          <div style="background: #f8fafc; padding: 30px; border-radius: 10px; margin-bottom: 30px;">
            <h2 style="color: #1e293b; margin-top: 0;">Chào mừng ${name}!</h2>
            <p style="color: #475569; line-height: 1.6;">
              Cảm ơn bạn đã đăng ký tài khoản Hippo Lovely. Để hoàn tất quá trình đăng ký, 
              vui lòng xác nhận địa chỉ email của bạn bằng cách nhấp vào nút bên dưới.
            </p>
            
            ${confirmationUrl ? `
              <div style="text-align: center; margin: 30px 0;">
                <a href="${confirmationUrl}" 
                   style="background: #e11d48; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                  Xác nhận Email
                </a>
              </div>
            ` : ''}
            
            <p style="color: #64748b; font-size: 14px; margin-bottom: 0;">
              Nếu bạn không tạo tài khoản này, vui lòng bỏ qua email này.
            </p>
          </div>
          
          <div style="text-align: center; color: #94a3b8; font-size: 12px;">
            <p>© 2024 Hippo Lovely. Kết nối yêu thương.</p>
          </div>
        </div>
      `,
    });

    console.log("Confirmation email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email xác nhận đã được gửi thành công",
        data: emailResponse 
      }), 
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-confirmation-email function:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        message: "Không thể gửi email xác nhận"
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);