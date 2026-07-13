from django.urls import path
from users import views

urlpatterns = [
    path('register/',views.RegisterView.as_view(), name='register'),
    path('verify-email/<uidb64>/<token>/',views. EmailVerificationView.as_view(), name='verify_email'),
    path('token/refresh/',views. CustomTokenRefreshView.as_view(), name='token_refresh'),
    path('resend-verification/', views.ResendVerificationView.as_view(), name='resend-verification'),
    path('forgot-password/', views.ForgotPasswordView.as_view(), name='forgot_password'),
    path('reset-password/<uidb64>/<token>/', views.ResetPasswordView.as_view()), 
    path('deposit/',views. DepositView.as_view(), name='deposit'),
    path('withdraw/', views.WithdrawView.as_view(), name='withdraw'),
    path('status/',views.UserStatusView.as_view(), name='user-status'),
    path('profile/', views.ProfileView.as_view(), name='profile'),

    
    
    #planes
    path('activate-plan/',views. ActivatePlanView.as_view(), name='activate-plan'),
    
    
    path('login/',views.LoginView.as_view(), name='login'),
    path('logout/',views.LogoutView.as_view(), name='token_logout'),
    path('surveymonkey/authorize/', views.SurveyMonkeyAuthorizeView.as_view(), name='surveymonkey_authorize'),
    path('surveymonkey/callback/', views.SurveyMonkeyCallbackView.as_view(), name='surveymonkey_callback'),
]

