from rest_framework import serializers
from .models import Transaction, User


class WithdrawSerializer(serializers.Serializer):
    """Serializer para solicitudes de retiro de USDT."""
    wallet_address = serializers.CharField(
        max_length=66,
        help_text="Dirección Ethereum/Polygon de destino (0x...)"
    )
    boost_amount = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        min_value=1,
        help_text="Cantidad de BOOST a retirar"
    )
    
    def validate_wallet_address(self, value):
        """Valida que sea una dirección Ethereum válida."""
        if not value.startswith('0x'):
            raise serializers.ValidationError("La dirección debe comenzar con '0x'")
        if len(value) != 42:
            raise serializers.ValidationError("La dirección debe tener 42 caracteres")
        try:
            int(value[2:], 16)  # Validar hexadecimal
        except ValueError:
            raise serializers.ValidationError("Dirección hexadecimal inválida")
        return value
    
    def validate_boost_amount(self, value):
        """Valida el monto mínimo."""
        if value < 100:  # Mínimo 1 USDT = 100 BOOST
            raise serializers.ValidationError("Monto mínimo: 100 BOOST (1 USDT)")
        return value


class TransactionSerializer(serializers.ModelSerializer):
    """Serializer para ver transacciones."""
    class Meta:
        model = Transaction
        fields = [
            'id', 'transaction_type', 'status', 'usdt_amount', 'boost_amount',
            'tx_hash', 'tx_status', 'created_at', 'description'
        ]
        read_only_fields = fields
